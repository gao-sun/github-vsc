import classNames from 'classnames';
import React, { ReactNode } from 'react';
import styles from './index.module.scss';

export type Props = {
  type?: 'info' | 'warning';
  children: ReactNode;
};

const Tip = ({ type = 'info', children }: Props) => {
  return (
    <div className={classNames(styles.tip, type === 'warning' && styles.warning)}>{children}</div>
  );
};

export default Tip;
