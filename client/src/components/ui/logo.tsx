import { useTheme } from '../../theme/use-theme';
import './logo.scss';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'auto' | 'light' | 'dark';
}

const Logo = ({ size = 'medium', variant = 'auto' }: LogoProps) => {
  const { theme } = useTheme();
  const displayVariant = variant === 'auto' ? theme : variant;

  return (
    <div className={`logo logo-${size} logo-${displayVariant}`}>
      <span className="logo-text">
        <span className="logo-simple">simple</span>
        <span className="logo-crm">crm</span>
      </span>
    </div>
  );
};

export default Logo;
