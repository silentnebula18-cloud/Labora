import { CLASS_CODES } from "../constants/classes";
import SelectDropdown, { type DropdownOption } from "./SelectDropdown";

interface ClassCodeDropdownProps {
  value: string;
  onChange: (kode: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
}

const CLASS_CODE_OPTIONS: DropdownOption[] = CLASS_CODES.map((code) => ({
  value: code,
  label: `Kelas ${code}`,
  badge: code,
}));

export default function ClassCodeDropdown({
  value,
  onChange,
  placeholder = "Pilih kode kelas (A1 – E2)",
  disabled = false,
  hasError = false,
}: ClassCodeDropdownProps) {
  const normalizedValue = value.trim().toUpperCase();

  return (
    <SelectDropdown
      value={normalizedValue}
      options={CLASS_CODE_OPTIONS}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      hasError={hasError}
    />
  );
}
