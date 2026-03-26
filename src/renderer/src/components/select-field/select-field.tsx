import { useId, useState, useRef, useEffect, useCallback } from "react";
import "./select-field.scss";
import cn from "classnames";
import { ChevronDownIcon } from "@primer/octicons-react";

export interface SelectProps
  extends Omit<
    React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLDivElement>,
      HTMLDivElement
    >,
    "onChange"
  > {
  theme?: "primary" | "dark";
  label?: string;
  value?: string;
  options?: { key: string; value: string; label: string }[];
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function SelectField({
  value,
  label,
  options = [{ key: "-", value: value?.toString() || "-", label: "-" }],
  theme = "primary",
  onChange,
  className,
}: Readonly<SelectProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((o) => o.value === value) ?? options[0];

  const close = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [close]);

  const selectOption = (option: { value: string; label: string }) => {
    if (onChange) {
      const syntheticEvent = {
        target: { value: option.value },
      } as React.ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        setIsOpen(true);
        setFocusedIndex(0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      setFocusedIndex((prev) => Math.min(prev + 1, options.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter" && focusedIndex >= 0) {
      selectOption(options[focusedIndex]);
      e.preventDefault();
    } else if (e.key === "Escape") {
      close();
    }
  };

  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[focusedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex, isOpen]);

  return (
    <div
      className={cn("select-field__container", className)}
      ref={containerRef}
    >
      {label && (
        <label htmlFor={id} className="select-field__label">
          {label}
        </label>
      )}

      <div
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-listbox`}
        tabIndex={0}
        className={cn("select-field", `select-field--${theme}`, {
          "select-field--open": isOpen,
        })}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <span className="select-field__value">{selectedOption?.label}</span>
        <ChevronDownIcon
          size={14}
          className={cn("select-field__chevron", {
            "select-field__chevron--open": isOpen,
          })}
        />
      </div>

      {isOpen && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="select-field__dropdown"
          ref={listRef}
        >
          {options.map((option, index) => (
            <li
              key={option.key}
              role="option"
              aria-selected={option.value === value}
              className={cn("select-field__option", {
                "select-field__option--selected": option.value === value,
                "select-field__option--focused": index === focusedIndex,
              })}
              onMouseEnter={() => setFocusedIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(option);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
