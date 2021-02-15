import React, { useRef, useState } from 'react';
import classNames from 'classnames';
import Spacer from '@/components/Spacer';
import Button from '@/components/Button';

import styles from './index.module.scss';

export type Props = {
  token?: string;
};

const PAT = ({ token }: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputToken, setInputToken] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasToken = !!token;

  const edit = () => {
    setInputToken(token ?? '');
    setIsEditing(true);
  };

  return (
    <div>
      <h4>GitHub Personal Access Token</h4>
      <div className={classNames(styles.patControl, hasToken && styles.enabled)}>
        {!isEditing && (
          <>
            <div className={styles.dot}></div>
            <div>{hasToken ? `Enabled (***${token?.slice(-4)})` : 'Not in Use'}</div>
            <Spacer />
            <Button onClick={edit}>{hasToken ? 'Update' : 'Setup'}</Button>
            {hasToken && (
              <Button onClick={() => {}} type="secondary">
                remove
              </Button>
            )}
          </>
        )}
        {isEditing && (
          <>
            <input
              type="text"
              value={inputToken}
              onChange={({ target: { value } }) => setInputToken(value)}
              ref={inputRef}
              autoFocus
            />
            <Button onClick={() => setIsEditing(false)}>OK</Button>
            <Button type="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </>
        )}
      </div>
      <div className={styles.description}>
        {hasToken
          ? 'Enjoy your 5,000 per hour rate limit.'
          : 'For unauthenticated requests, the rate limit is 60 per hour. It will increase to 5,000 per hour with your PAT.'}
      </div>
    </div>
  );
};

export default PAT;
