export default function Checkbox({
  checked,
  onChange,
  children,
  name,
}) {
  return (
    <label className="artifact-checkbox">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
      />

      <span className="checkbox-box">
        ✓
      </span>

      <span className="checkbox-label">
        {children}
      </span>
    </label>
  );
}