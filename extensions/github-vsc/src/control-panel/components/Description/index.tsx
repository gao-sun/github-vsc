import React, { ReactNode } from 'react';
import styles from './index.module.scss';

export type Props = {
  children: ReactNode;
};

const Description = ({ children }: Props) => {
  return <div className={styles.description}>{children}</div>;
};

export default Description;
