import { useEffect, useState, useRef, useContext } from 'react';
import { Alert } from 'react-native';
import { setLogin } from 'api/setLogin';
import { clearLogin } from 'api/clearLogin';
import { removeProfile } from 'api/removeProfile';
import { setAccountAccess } from 'api/setAccountAccess';
import { addAccount } from 'api/addAccount';
import { createWebsocket } from 'api/fetchUtil';
import { StoreContext } from 'context/StoreContext';
import { AccountContext } from 'context/AccountContext';
import { ProfileContext } from 'context/ProfileContext';
import { CardContext } from 'context/CardContext';
import { ChannelContext } from 'context/ChannelContext';
import { RingContext } from 'context/RingContext';
import { getVersion, getApplicationName, getDeviceId } from 'react-native-device-info'
import messaging from '@react-native-firebase/messaging';

export function useAppContext() {
  const [state, setState] = useState({
    session: null,
    status: null,
    loggingOut: false,
    adminToken: null,
    version: getVersion(),
  });
  const store = useContext(StoreContext);
  const account = useContext(AccountContext);
  const profile = useContext(ProfileContext);
  const card = useContext(CardContext);
  const channel = useContext(ChannelContext);
  const ring = useContext(RingContext);
  const delay = useRef(0);

  const ws = useRef(null);
  const deviceToken = useRef(null);
  const access = useRef(null);
  const init = useRef(false);

  const updateState = (value) => {
    setState((s) => ({ ...s, ...value }))
  }

  useEffect(() => {
    (async () => {
      try {
        try {
          deviceToken.current = await messaging().getToken();
        }
        catch (err) {
          console.log(err);
          //Alert.alert('FCM', err.toString());
        }
      }
      catch (err) {
        console.log(err);
        deviceToken.current = null;
      }
      access.current = await store.actions.init();
      if (access.current) {
        await setSession();
      }
      else {
        updateState({ session: false });
      }
      init.current = true;
    })();
  }, []);

  const setSession = async () => {
    const { loginTimestamp } = access.current;
    updateState({ session: true, loginTimestamp, status: 'connecting' });
    await account.actions.setSession(access.current);
    await profile.actions.setSession(access.current);
    await card.actions.setSession(access.current);
    await channel.actions.setSession(access.current);
    await ring.actions.setSession(access.current);
    setWebsocket(access.current);
  }

  const clearSession = async () => {
    account.actions.clearSession();
    profile.actions.clearSession();
    card.actions.clearSession();
    channel.actions.clearSession();
    ring.actions.clearSession();
    updateState({ session: false });
    clearWebsocket();
  }

  const notifications = [
    { event: 'contact.addCard', messageTitle: 'New Contact Request' },
    { event: 'contact.updateCard', messageTitle: 'Contact Update' },
    { event: 'content.addChannel.superbasic', messageTitle: 'New Topic' },
    { event: 'content.addChannel.sealed', messageTitle: 'New Topic' },
    { event: 'content.addChannelTopic.superbasic', messageTitle: 'New Topic Message' },
    { event: 'content.addChannelTopic.sealed', messageTitle: 'New Topic Message' },
    { event: 'ring', messageTitle: 'Incoming Call' },
  ];

  const actions = {
    create: async (server, username, password, token) => {
      if (!init.current || access.current) {
        throw new Error('invalid session state');
      }
      await addAccount(server, username, password, token);
      const session = await setLogin(username, server, password, getApplicationName(), getVersion(), getDeviceId(), deviceToken.current, notifications)
      access.current = { server, token: session.appToken, guid: session.guid };
      await store.actions.setSession(access.current);
      await setSession();
      if (session.pushSupported) {
        messaging().requestPermission().then(status => {})
      }
    },
    access: async (server, token) => {
      if (!init.current || access.current) {
        throw new Error('invalid session state');
      }
      const session = await setAccountAccess(server, token, getApplicationName(), getVersion(), getDeviceId(), deviceToken.current, notifications);
      access.current = { server, token: session.appToken, guid: session.guid };
      await store.actions.setSession(access.current);
      await setSession();
      if (session.pushSupported) {
        messaging().requestPermission().then(status => {})
      }
    },
    login: async (username, password) => {
      if (!init.current || access.current) {
        throw new Error('invalid session state');
      }
      const acc = username.split('@');
      const session = await setLogin(acc[0], acc[1], password, getApplicationName(), getVersion(), getDeviceId(), deviceToken.current, notifications)
      access.current = { server: acc[1], token: session.appToken, guid: session.guid };
      await store.actions.setSession(access.current);
      await setSession(); 
      if (session.pushSupported) {
        messaging().requestPermission().then(status => {})
      }
    },
    logout: async () => {
      if (!access.current) {
        throw new Error('invalid session state');
      }
      updateState({ loggingOut: true });
      try {
        await messaging().deleteToken();
        deviceToken.current = await messaging().getToken();
        await clearLogin(state.server, state.token);
      }
      catch (err) {
        console.log(err);
      }
      await clearSession();
      access.current = null;
      await store.actions.clearSession();
      await store.actions.clearFirstRun();
      updateState({ loggingOut: false });
    },
    remove: async () => {
      if (!access.current) {
        throw new Error('invalid session state');
      }
      const { server, token } = access.current || {};
      await removeProfile(server, token);
      await clearSession();
      await store.actions.clearSession();
    },
  }

  const setWebsocket = (session) => {
    ws.current = createWebsocket(`wss://${session.server}/status?mode=ring`);
    ws.current.onmessage = (ev) => {
      try {
        delay.current = 0;
        let activity = JSON.parse(ev.data);
        updateState({ status: 'connected' });

        if (activity.revision) {
          const { profile: profileRev, account: accountRev, channel: channelRev, card: cardRev } = activity.revision;
          profile.actions.setRevision(profileRev);
          account.actions.setRevision(accountRev);
          channel.actions.setRevision(channelRev);
          card.actions.setRevision(cardRev);
        }
        else if (activity.ring) {
          const { cardId, callId, calleeToken, iceUrl, iceUsername, icePassword } = activity.ring;
          ring.actions.ring(cardId, callId, calleeToken, iceUrl, iceUsername, icePassword);
        }
        else {
          const { profile: profileRev, account: accountRev, channel: channelRev, card: cardRev } = activity;
          profile.actions.setRevision(profileRev);
          account.actions.setRevision(accountRev);
          channel.actions.setRevision(channelRev);
          card.actions.setRevision(cardRev);
        }
      }
      catch (err) {
        console.log(err);
        ws.current.close();
      }
    }
    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({ AppToken: session.token }))
    }
    ws.current.onclose = (e) => {
      console.log(e)
      updateState({ status: 'disconnected' });
      setTimeout(() => {
        if (ws.current != null) {
          ws.current.onmessage = () => {}
          ws.current.onclose = () => {}
          ws.current.onopen = () => {}
          ws.current.onerror = () => {}
          delay.current = 1;
          setWebsocket(session);
        }
      }, 1000 * delay.current)
    }
    ws.current.error = (e) => {
      console.log(e);
      ws.current.close();
    }
  }
 
  const clearWebsocket = ()  => {
    if (ws.current) {
      ws.current.onmessage = () => {};
      ws.current.onclose = () => {};
      ws.current.onerror = () => {};
      ws.current.close();
      ws.current = null;
    }
  }

  return { state, actions }
}

