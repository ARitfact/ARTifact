export default function Input({
  id,
  name,
  type = "text",
  value,
  placeholder = "",
  onChange,
  onBlur,
  disabled = false,
  autoComplete,
  className = "",
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      autoComplete={autoComplete}
      className={`artifact-input ${className}`}
    />
  );
}