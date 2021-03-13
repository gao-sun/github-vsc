import classNames from 'classnames';
import React, { ReactNode } from 'react';
import styles from './index.module.scss';

export type Props = {
  children: ReactNode;
  noMargin?: boolean;
};

const Description = ({ children, noMargin }: Props) => {
  return (
    <div className={classNames(styles.description, noMargin && styles.noMargin)}>{children}</div>
  );
};

export default Description;
