import React, { useState } from 'react';

import Button from '@/components/Button';
import Description from '@/components/Description';
import Title from '@/components/Title';
import { vscodeApi } from '@core/utils/vscode';
import { RepoData, SessionData, SessionOS } from '@core/types/foundation';
import { RemoteSessionMessagePayload, WebviewActionEnum } from '@src/core/types/webview-action';

import styles from './index.module.scss';
import RadioGroup from '@/components/RadioGroup';
import Tip from '@/components/Tip';
import useListenMessage from '@src/core/hooks/useListenMessage';
import { RunnerStatus } from '@src/extension/remote-session/types';
import { conditional } from '@src/extension/utils/object';

export type Props = {
  repoData?: RepoData;
  sessionData?: SessionData;
};

export enum SessionMethod {
  StartNew = 'Start',
  Resume = 'Resume',
}

export type SessionOption = {
  value: SessionMethod;
  message: string;
};

const sessionOptions: readonly SessionOption[] = Object.freeze([
  { value: SessionMethod.StartNew, message: 'Start a new session.' },
  { value: SessionMethod.Resume, message: 'Resume an existing session.' },
]);

const RemoteSession = ({ repoData }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [serverAddress, setServerAddress] = useState('ws://localhost:3000');
  const [newSessionOS, setNewSessionOS] = useState(SessionOS.Ubuntu);
  const [sessionMethod, setSessionMethod] = useState(SessionMethod.StartNew);

  useListenMessage(({ action, payload }) => {
    if (action === WebviewActionEnum.RemoteSessionMessage) {
      const { runnerStatus, type, message } = payload as RemoteSessionMessagePayload;
      if (type === 'message') {
        setMessage(message ?? '');
      }
      if (type === 'error') {
        setError(message ?? 'Error occurred.');
      }
      if (runnerStatus === RunnerStatus.SessionStarted) {
        setLoading(false);
      }
    }
  });

  const connectSession = () => {
    const payload: Partial<SessionData> = {
      githubRef: repoData?.ref,
      sessionId: conditional(sessionMethod === SessionMethod.Resume && sessionId),
      serverAddress,
      os: conditional(sessionMethod === SessionMethod.StartNew && newSessionOS),
    };
    console.log('trying to connect with payload', payload);
    vscodeApi.postMessage({ action: WebviewActionEnum.ConnectToRemoteSession, payload });
    setLoading(true);
  };

  return (
    <div className={styles.remoteSession}>
      <Title>Remote Session</Title>
      <Description>Start a remote session to enable terminal access.</Description>
      <RadioGroup
        options={sessionOptions}
        onChange={setSessionMethod}
        name="session-method"
        value={sessionMethod}
        disabled={loading}
      />
      <Title level={3}>Runner Server</Title>
      <select
        name="runner-server"
        disabled={loading}
        value={serverAddress}
        onChange={({ target: { value } }) => setServerAddress(value)}
      >
        <option value="ws://localhost:3000">localhost:3000</option>
      </select>
      {sessionMethod === SessionMethod.StartNew && (
        <>
          <Title level={3}>Runner Client OS</Title>
          <select
            disabled={loading}
            name="runner-client-os"
            value={newSessionOS}
            onChange={({ target: { value } }) => {
              setNewSessionOS(value as SessionOS);
            }}
          >
            {Object.entries(SessionOS).map(([key, os]) => (
              <option key={key} value={os}>
                {os}
              </option>
            ))}
          </select>
        </>
      )}
      {sessionMethod === SessionMethod.Resume && (
        <>
          <Title level={3}>Session ID</Title>
          <input
            disabled={loading}
            type="text"
            value={sessionId}
            onChange={({ target: { value } }) => setSessionId(value)}
          />
        </>
      )}
      <div className={styles.action}>
        <Button disabled={loading} onClick={connectSession}>
          {sessionMethod} Session
        </Button>
      </div>
      {error && <Tip type="warning">{error}</Tip>}
      {(loading || message) && !error && <Tip>{message || 'Connecting...'}</Tip>}
    </div>
  );
};

export default RemoteSession;
