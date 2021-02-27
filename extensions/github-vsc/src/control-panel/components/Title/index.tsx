import classNames from 'classnames';
import React, { ReactNode } from 'react';
import styles from './index.module.scss';

export type Props = {
  children: ReactNode;
  level?: 1 | 2 | 3;
};

const Title = ({ children, level = 2 }: Props) => {
  return (
    <div
      className={classNames(
        styles.title,
        level === 1 && styles.large,
        level === 3 && styles.subtitle,
      )}
    >
      {children}
    </div>
  );
};

export default Title;
