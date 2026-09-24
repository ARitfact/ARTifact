export default function Loader({
  text = "Loading...",
}) {
  return (
    <div className="artifact-loader">
      <div className="loader-orbit">
        <span />
        <span />
        <span />
      </div>

      {text && (
        <p>{text}</p>
      )}
    </div>
  );
}