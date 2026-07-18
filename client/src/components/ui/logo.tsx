import './logo.scss';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'light' | 'dark';
}

const Logo = ({ size = 'medium', variant = 'light' }: LogoProps) => {
  return (
    <div className={`logo logo-${size} logo-${variant}`}>
      <span className="logo-text">
        <span className="logo-simple">simple</span>
        <span className="logo-crm">crm</span>
      </span>
    </div>
  );
};

export default Logo;
