import { useState, useEffect, useContext } from 'react';
import { Linking } from 'react-native';
import { ConversationContext } from 'context/ConversationContext';
import { CardContext } from 'context/CardContext';
import { ProfileContext } from 'context/ProfileContext';
import { AccountContext } from 'context/AccountContext';
import moment from 'moment';
import { useWindowDimensions, Text } from 'react-native';
import Colors from 'constants/Colors';
import { getCardByGuid } from 'context/cardUtil';
import { decryptTopicSubject } from 'context/sealUtil';
import { sanitizeUrl } from '@braintree/sanitize-url';
import Share from 'react-native-share';
import RNFetchBlob from "rn-fetch-blob";

export function useTopicItem(item, hosting, remove, contentKey) {

  const [state, setState] = useState({
    name: null,
    nameSet: null,
    known: null,
    logo: null,
    timestamp: null,
    message: null,
    clickable: null,
    carousel: false,
    carouselIndex: 0,
    width: null,
    height: null,
    activeId: null,
    fontSize: 14,
    fontColor: Colors.text,
    editable: false,
    deletable: false,
    assets: [],
    sharing: false,
  });

  const conversation = useContext(ConversationContext);
  const profile = useContext(ProfileContext);
  const card = useContext(CardContext);
  const account = useContext(AccountContext);
  const dimensions = useWindowDimensions();

  const updateState = (value) => {
    setState((s) => ({ ...s, ...value }));
  }

  useEffect(() => {
    updateState({ width: dimensions.width, height: dimensions.height });
  }, [dimensions]);

  useEffect(() => {

    const { topicId, revision, detail, unsealedDetail } = item;
    const { guid, created, dataType, data, status, transform } = detail || {};

    let name, nameSet, known, logo;
    const identity = profile.state?.identity;
    if (guid === identity.guid) {
      known = true;
      if (identity.name) {
        name = identity.name;
      }
      else {
        name = `${identity.handle}@${identity.node}`;
      }
      const img = profile.state.imageUrl;
      if (img) {
        logo = img;
      }
      else {
        logo = 'avatar';
      }
    }
    else {
      const contact = getCardByGuid(card.state.cards, guid)?.card;
      if (contact) {
        logo = contact.profile?.imageSet ? card.actions.getCardImageUrl(contact.cardId) : null;

        known = true;
        if (contact.profile.name) {
          name = contact.profile.name;
          nameSet = true;
        }
        else {
          name = `${contact.profile.handle}@${contact.profile.node}`;
          nameSet = false;
        }
      }
      else {
        name = "unknown";
        nameSet = false;
        known = false;
        logo = null;
      }
    }

    let parsed, sealed, message, clickable, assets, fontSize, fontColor;
    if (dataType === 'superbasictopic') {
      try {
        sealed = false;
        parsed = JSON.parse(data);
        message = parsed?.text;
        clickable = clickableText(parsed.text);
        assets = parsed.assets;
        if (parsed.textSize === 'small') {
          fontSize = 10;
        }
        else if (parsed.textSize === 'large') {
          fontSize = 20;
        }
        else {
          fontSize = 14;
        }
        if (parsed.textColor) {
          fontColor = parsed.textColor;
        }
        else {
          fontColor = Colors.text;
        }
      }
      catch (err) {
        console.log(err);
      }
    }
    else if (dataType === 'sealedtopic') {
      let unsealed = unsealedDetail;
      if (!unsealed && contentKey) {
        try {
          unsealed = decryptTopicSubject(detail?.data, contentKey);
          (async () => {
            try {
              await conversation.actions.unsealTopic(topicId, revision, unsealed);
            }
            catch(err) {
              console.log(err);
            }
          })();
        }
        catch(err) {
          console.log(err);
        }
      }
      if (unsealed) {
        sealed = false;
        parsed = unsealed.message;
        message = parsed?.text;
        clickable = clickableText(parsed?.text);
        if (parsed?.textSize === 'small') {
          fontSize = 10;
        }
        else if (parsed?.textSize === 'large') {
          fontSize = 20;
        }
        else {
          fontSize = 14;
        }
        if (parsed?.textColor) {
          fontColor = parsed?.textColor;
        }
        else {
          fontColor = Colors.text;
        }
      }
      else {
        sealed = true;
      }
    }

    let timestamp;
    const date = new Date(created * 1000);
    const now = new Date();
    const offset = now.getTime() - date.getTime();
    if(offset < 86400000) {
      timestamp = moment(date).format('h:mma');
    }
    else if (offset < 31449600000) {
      timestamp = moment(date).format('M/DD');
    }
    else {
      timestamp = moment(date).format('M/DD/YYYY');
    }

    const editable = guid === identity?.guid && parsed;
    const deletable = editable || hosting;

    updateState({ logo, name, nameSet, known, sealed, message, clickable, fontSize, fontColor, timestamp, transform, status, assets, deletable, editable, editData: parsed, editMessage: message, editType: dataType });
  }, [conversation.state, card.state, account.state, item, contentKey]);

  const unsealTopic = async (topicId, revision, topicDetail) => {
    try {
      const channelDetail = conversation.state.channel?.detail;
      const seals = getChannelSeals(channelDetail?.data);
      const sealKey = account.state.sealKey;
      if (isUnsealed(seals, sealKey)) {
        const contentKey = await getContentKey(seals, sealKey);
      }
    }
    catch(err) {
      console.log(err);
    }
  };

  const clickableText = (text) => {
      const urlPatternn = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator

      const hostPattern = new RegExp('^https?:\\/\\/', 'i');

      let clickable = [];
      let group = '';
      const words = text == null ? [''] : text.split(' ');
      words.forEach((word, index) => {
        if (!!urlPatternn.test(word)) {
          clickable.push(<Text key={index}>{ group }</Text>);
          group = '';
          const url = !!hostPattern.test(word) ? word : `https://${word}`;
          clickable.push(<Text key={'link-' + index} onPress={() => Linking.openURL(sanitizeUrl(url))} style={{ fontStyle: 'italic' }}>{ sanitizeUrl(word) + ' ' }</Text>);
        }
        else {
          group += `${word} `;
        }
      })
      clickable.push(<Text key={words.length}>{ group }</Text>);
      return <Text>{ clickable }</Text>;
  };

  const actions = {
    showCarousel: (index) => {
      updateState({ carousel: true, carouselIndex: index });
    },
    hideCarousel: () => {
      updateState({ carousel: false });
    },
    setActive: (activeId) => {
      updateState({ activeId });
    },
    getTopicAssetUrl: (topicId, assetId) => {
      return conversation.actions.getTopicAssetUrl(topicId, assetId);
    },
    shareMessage: async () => {
      if (!state.sharing) {
        updateState({ sharing: true });
        const files = []
        const unlink = []
        const fs = RNFetchBlob.fs;
        try {
          const data = JSON.parse(item.detail.data)
          const assets = data.assets || []

          for (let i = 0; i < assets.length; i++) {

            let asset
            if (assets[i].image) {
              asset = assets[i].image.full;
            }
            else if (assets[i].video?.hd) {
              asset = assets[i].video.hd;
            }
            else if (assets[i].video?.lq) {
              asset = assets[i].video.lq;
            }
            else if (assets[i].audio?.full) {
              asset = assets[i].audio.full;
            }

            if (asset) {
              const url = actions.getTopicAssetUrl(item.topicId, asset);
              const blob = await RNFetchBlob.config({ fileCache: true }).fetch("GET", url);
              const type = blob.respInfo.headers["Content-Type"] || blob.respInfo.headers["content-type"]

              const src = blob.path();
              const dir = src.split('/').slice(0,-1).join('/')
              const dst = dir + '/' + asset + '.' + getExtension(type);
              try {
                await fs.unlink(dst);
              }
              catch(err) {
                console.log(err);
              }
              await RNFetchBlob.fs.mv(src, dst);
              files.push(`file://${dst}`);
              unlink.push(dst);
            }
          }

          await Share.open({ urls: files, message: files.length > 0 ? null : data.text, title: 'Databag', subject: 'Shared from Databag' })
          while (unlink.length > 0) {
            const file = unlink.shift();
            await fs.unlink(file);
          }
        }
        catch(err) {
          console.log(err);
          for (let i = 0; i < fs.unlink.length; i++) {
            try {
              await fs.unlink(unlink[i])
            }
            catch(err) {
              console.log(err);
            }
          }
        }
        updateState({ sharing: false });
      }
    },
  };

  return { state, actions };
}

function getExtension(mime) {
  if (mime === 'image/gif') {
    return 'gif';
  }
  if (mime === 'image/jpeg') {
    return 'jpg';
  }
  if (mime === 'text/plain') {
    return 'txt';
  }
  if (mime === 'image/png') {
    return 'png';
  }
  if (mime === 'image/bmp') {
    return 'bmp';
  }
  if (mime === 'image/svg+xml') {
    return 'svg';
  }
  if (mime === 'application/msword') {
    return 'doc';
  }
  if (mime === 'application/pdf') {
    return 'pdf';
  }
  if (mime === 'application/vnd.ms-excel') {
    return 'xls';
  }
  if (mime === 'application/vnd.ms-powerpoint') {
    return 'ppt';
  }
  if (mime === 'application/zip') {
    return 'zip';
  }
  if (mime === 'audio/mpeg') {
    return 'mp3';
  }
  if (mime === 'audio/ogg') {
    return 'ogg';
  }
  if (mime === 'video/mpeg') {
    return 'mpg';
  }
  if (mime === 'video/quicktime') {
    return 'mov';
  }
  if (mime === 'video/x-ms-wmv') {
    return 'wmv';
  }
  if (mime === 'video/x-msvideo') {
    return 'avi';
  }
  if (mime === 'video/mp4') {
    return 'mp4';
  }
  return 'bin'
}
