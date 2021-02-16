import React, { ReactNode } from 'react';
import styles from './index.module.scss';

export type Props = {
  children: ReactNode;
};

const Title = ({ children }: Props) => {
  return <div className={styles.title}>{children}</div>;
};

export default Title;
