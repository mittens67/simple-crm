import './loading-spinner.scss';

const LoadingSpinner = () => {
  return (
    <div className="loading-container" data-testid="loading-spinner">
      <div className="spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      <p className="loading-text">Loading…</p>
    </div>
  );
};

export default LoadingSpinner;
