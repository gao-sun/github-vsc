import React, { useEffect, useState } from 'react';

import Button from '@/components/Button';
import Description from '@/components/Description';
import Title from '@/components/Title';
import { vscodeApi } from '@core/utils/vscode';
import { RepoData, SessionData, SessionOS } from '@core/types/foundation';
import { RemoteSessionDataPayload, WebviewActionEnum } from '@src/core/types/webview-action';

import styles from './index.module.scss';
import RadioGroup from '@/components/RadioGroup';
import Tip from '@/components/Tip';
import useListenMessage from '@src/core/hooks/useListenMessage';
import { RunnerStatus } from '@src/extension/remote-session/types';
import { conditional } from '@src/extension/utils/object';
import { RunnerClientStatus } from '@github-vsc-runner/core';
import classNames from 'classnames';
import { RunnerStatusData } from '@src/core/types/session';
import { defaultShell } from '@src/core/consts/session';

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

const RemoteSession = ({ repoData, sessionData }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [shell, setShell] = useState('');
  const [serverAddress, setServerAddress] = useState('ws://localhost:3000');
  const [newSessionOS, setNewSessionOS] = useState(SessionOS.Ubuntu);
  const [sessionMethod, setSessionMethod] = useState(SessionMethod.StartNew);
  const [runnerStatusData, setRunnerStatusData] = useState<RunnerStatusData>({
    runnerStatus: RunnerStatus.Disconnected,
    runnerClientStatus: RunnerClientStatus.Offline,
  });
  const { runnerClientOS } = runnerStatusData;

  useEffect(() => {
    if (sessionData?.defaultShell || runnerClientOS) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      setShell(sessionData?.defaultShell ?? defaultShell[runnerClientOS!]);
    }
  }, [runnerClientOS, sessionData?.defaultShell]);

  useEffect(() => {
    vscodeApi.postMessage({
      action: WebviewActionEnum.RequestRemoteRessionData,
    });
  }, []);

  useEffect(() => {
    if (sessionData?.sessionId && !sessionId) {
      setServerAddress(sessionData.serverAddress);
      setSessionId(sessionData.sessionId);
      setSessionMethod(SessionMethod.Resume);
    } else if (!sessionData?.sessionId) {
      setSessionId('');
    }
  }, [sessionData?.serverAddress, sessionData?.sessionId, sessionId]);

  useListenMessage(({ action, payload }) => {
    if (action === WebviewActionEnum.RemoteSessionData) {
      const { type, message, ...runnerStatusData } = payload as RemoteSessionDataPayload;

      setRunnerStatusData(runnerStatusData);

      if (type === 'message') {
        setMessage(message ?? '');
      }
      if (type === 'error') {
        setError(message ?? 'Error occurred.');
        setLoading(false);
      }
      if (runnerStatusData.runnerStatus === RunnerStatus.SessionStarted) {
        setLoading(false);
      }
    }
  });

  const connectSession = () => {
    const payload: SessionData = {
      githubRef: repoData?.ref,
      sessionId: conditional(sessionMethod === SessionMethod.Resume && sessionId),
      serverAddress,
      os: conditional(sessionMethod === SessionMethod.StartNew && newSessionOS),
    };
    console.log('trying to connect with payload', payload);
    vscodeApi.postMessage({ action: WebviewActionEnum.ConnectToRemoteSession, payload });
    setLoading(true);
  };

  const disconnectSession = () =>
    vscodeApi.postMessage({ action: WebviewActionEnum.DisconnectRemoteRession });
  const terminateSession = () =>
    vscodeApi.postMessage({ action: WebviewActionEnum.TerminateRemoteRession });

  const newTerminal = () => {
    vscodeApi.postMessage({ action: WebviewActionEnum.ActivateTerminal, payload: { shell } });
  };

  return (
    <div className={styles.remoteSession}>
      <Title>Remote Session</Title>
      {runnerStatusData.runnerStatus !== RunnerStatus.SessionStarted && (
        <>
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
        </>
      )}
      {runnerStatusData.runnerStatus === RunnerStatus.SessionStarted && (
        <>
          <div className={styles.row}>
            <Title level={3} noMargin>
              Runner Server
            </Title>
            <Description noMargin>{serverAddress}</Description>
          </div>
          <div className={styles.row}>
            <Title level={3} noMargin>
              Runner Client
            </Title>
            <Description noMargin>{runnerStatusData.runnerClientStatus}</Description>
          </div>
          {runnerStatusData.runnerClientOS && (
            <div className={styles.row}>
              <Title level={3} noMargin>
                OS
              </Title>
              <Description noMargin>{runnerStatusData.runnerClientOS}</Description>
            </div>
          )}
          {runnerStatusData.sessionId && (
            <div className={styles.row}>
              <Title level={3} noMargin>
                Session ID
              </Title>
              <Description noMargin>{runnerStatusData.sessionId}</Description>
            </div>
          )}
          <div className={classNames(styles.action, styles.unplug)}>
            <Button type="secondary" disabled={loading} onClick={terminateSession}>
              Terminate
            </Button>
            <Button type="secondary" disabled={loading} onClick={disconnectSession}>
              Disconnect
            </Button>
          </div>
          <Title level={3}>Terminal</Title>
          <div className={classNames(styles.row, styles.terminal)}>
            <input
              type="text"
              placeholder="Shell file"
              value={shell}
              onChange={({ target: { value } }) => setShell(value)}
            ></input>
            <Button disabled={loading} onClick={newTerminal}>
              New Terminal
            </Button>
          </div>
        </>
      )}
      {error && <Tip type="warning">{error}</Tip>}
      {(loading || message) && !error && <Tip>{message || 'Connecting...'}</Tip>}
    </div>
  );
};

export default RemoteSession;
