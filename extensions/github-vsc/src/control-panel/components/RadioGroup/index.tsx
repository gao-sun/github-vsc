import React from 'react';
import styles from './index.module.scss';

export interface OptionLike<T extends string> {
  value: T;
  message?: string;
}

export type Props<T extends string> = {
  options: readonly OptionLike<T>[];
  value: string;
  onChange: (value: T) => void;
  disabled?: boolean;
  name: string;
};

const RadioGroup = <T extends string>({
  options,
  disabled,
  name,
  value: checkedValue,
  onChange,
}: Props<T>) => {
  return (
    <div className={styles.group}>
      {options.map(({ value: currentValue, message }) => (
        <div key={currentValue} className={styles.option}>
          <input
            disabled={disabled}
            type="radio"
            name={name}
            id={`${name}-${currentValue}`}
            checked={checkedValue === currentValue}
            onChange={({ target: { value } }) => {
              if (value === 'on') {
                onChange(currentValue);
              }
            }}
          />
          <label htmlFor={`${name}-${currentValue}`}>{message ?? currentValue}</label>
        </div>
      ))}
    </div>
  );
};

export default RadioGroup;
