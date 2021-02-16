import React, { ReactNode } from 'react';
import styles from './index.module.scss';

export type Props = {
  children: ReactNode;
};

const Tip = ({ children }: Props) => {
  return <div className={styles.tip}>{children}</div>;
};

export default Tip;
