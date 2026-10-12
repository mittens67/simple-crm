import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { parse, validate, Kind, type DocumentNode } from 'graphql';
import { typeDefs } from '../graphql/typedefs';
import { resolvers } from '../graphql/resolvers';

/**
 * Validates every GraphQL document the client sends against the schema the
 * server actually serves.
 *
 * This is the hole that let the original Deals and Support pages ship broken.
 * The client's hand-written types agreed with the client's pages and only
 * disagreed with the server, and the disagreement lived inside untyped `gql`
 * template strings that TypeScript never reads — so a clean `tsc` on both
 * sides proved nothing. Codegen would close this properly; until then, this
 * test does, and it costs one file.
 *
 * It parses the client sources rather than importing them, so the server test
 * suite needs no client build step.
 */

const CLIENT_SRC = path.resolve(__dirname, '../../../client/src');

interface ClientDocument {
  file: string;
  body: string;
}

const client_files = (): string[] => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) files.push(full);
    }
  };
  walk(CLIENT_SRC);
  return files;
};

/**
 * Documents are composed by splicing constants in as `${NAME}`, in two styles:
 * a `gql` fragment appended at document level, and a bare template string of
 * field names spliced inside a selection set. Both are resolved textually here
 * rather than by evaluating the modules.
 */
const collect_documents = (): ClientDocument[] => {
  const files = client_files();
  const constants = new Map<string, string>();

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:gql)?`([\s\S]*?)`/g)) {
      constants.set(match[1], match[2]);
    }
  }

  const resolve = (body: string, file: string): string => {
    let current = body;
    // Constants can reference other constants; the bound stops a cycle from
    // hanging the suite.
    for (let depth = 0; depth < 10 && current.includes('${'); depth += 1) {
      current = current.replace(/\$\{\s*(\w+)\s*\}/g, (whole, name: string) => {
        const value = constants.get(name);
        if (value === undefined) {
          throw new Error(`${file} interpolates ${whole}, which this test could not resolve`);
        }
        return value;
      });
    }
    return current;
  };

  const found: ClientDocument[] = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const relative = path.relative(CLIENT_SRC, file);
    for (const match of source.matchAll(/\bgql`([\s\S]*?)`/g)) {
      found.push({ file: relative, body: resolve(match[1], relative) });
    }
  }
  return found;
};

const has_operation = (document: DocumentNode): boolean =>
  document.definitions.some((definition) => definition.kind === Kind.OPERATION_DEFINITION);

describe('client GraphQL documents', () => {
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const documents = collect_documents();

  const parsed = documents.map((document) => {
    try {
      return { ...document, ast: parse(document.body) };
    } catch (error) {
      throw new Error(
        `Could not parse a gql document in ${document.file}: ${(error as Error).message}`
      );
    }
  });

  // Interpolation above already inlines whatever fragments a document uses, so
  // each one validates on its own.
  const operations = parsed.filter((document) => has_operation(document.ast));

  it('finds the client operations at all', () => {
    // A silent zero here would make every assertion below vacuous.
    expect(operations.length).toBeGreaterThan(10);
  });

  it.each(operations.map((document, index) => [`${document.file} #${index}`, document] as const))(
    'validates %s against the server schema',
    (_label, document) => {
      const errors = validate(schema, document.ast).map((error) => error.message);

      expect(errors, `${document.file} sends a document the server would reject`).toEqual([]);
    }
  );
});
