package databag

import (
  "testing"
  "encoding/json"
  "github.com/gorilla/websocket"
  "github.com/gorilla/mux"
  "github.com/stretchr/testify/assert"
)

func TestConnectContact(t *testing.T) {
  var card Card
  var revision Revision
  var msg DataMessage
  var vars map[string]string
  var cardRevision int64
  var contactStatus ContactStatus

  // create some contacts for this test
  access := AddTestContacts(t, "connect", 2)

  // get A identity message
  r, w, _ := NewRequest("GET", "/profile/message", nil)
  SetBearerAuth(r, access[0])
  GetProfileMessage(w, r)
  assert.NoError(t, ReadResponse(w, &msg))

  // app connects websocket
  ws := getTestWebsocket()
  announce := Announce{ AppToken: access[1] }
  data, _ := json.Marshal(&announce)
  ws.WriteMessage(websocket.TextMessage, data)
  _, data, _ = ws.ReadMessage()
  assert.NoError(t, json.Unmarshal(data, &revision))
  cardRevision = revision.Card

  // add A card in B
  r, w, _ = NewRequest("POST", "/contact/cards", &msg)
  SetBearerAuth(r, access[1])
  AddCard(w, r)
  assert.NoError(t, ReadResponse(w, &card))

  // profile revision incremented
  _, data, _ = ws.ReadMessage()
  assert.NoError(t, json.Unmarshal(data, &revision))
  assert.NotEqual(t, cardRevision, revision.Card)
  cardRevision = revision.Card

  // update A status to connecting
  r, w, _ = NewRequest("PUT", "/contact/cards/{cardId}/status", APP_CARDCONNECTING)
  vars = map[string]string{ "cardId": card.CardId }
  r = mux.SetURLVars(r, vars)
  SetBearerAuth(r, access[1])
  SetCardStatus(w, r)
  assert.NoError(t, ReadResponse(w, &card))

  // card revision incremented
  _, data, _ = ws.ReadMessage()
  assert.NoError(t, json.Unmarshal(data, &revision))
  assert.NotEqual(t, cardRevision, revision.Card)
  cardRevision = revision.Card

  // get open message to A
  r, w, _ = NewRequest("GET", "/contact/cards/{cardId}/openMessage", nil)
  vars = map[string]string{ "cardId": card.CardId }
  r = mux.SetURLVars(r, vars)
  SetBearerAuth(r, access[1])
  GetOpenMessage(w, r)
  assert.NoError(t, ReadResponse(w, &msg))

  // set open message in A
  r, w, _ = NewRequest("PUT", "/contact/openMessage", msg)
  SetOpenMessage(w, r)
  assert.NoError(t, ReadResponse(w, &contactStatus))

  // get view of cards in A
  r, w, _ = NewRequest("GET", "/contact/cards/view", nil)
  SetBearerAuth(r, access[0])
  GetCardView(w, r)
  var views []CardView
  assert.NoError(t, ReadResponse(w, &views))
  assert.Equal(t, len(views), 1)

  // get B card in A
  r, w, _ = NewRequest("GET", "/contact/cards/{cardId}", nil)
  vars = map[string]string{ "cardId": views[0].CardId }
  r = mux.SetURLVars(r, vars)
  SetBearerAuth(r, access[0])
  GetCard(w, r)
  assert.NoError(t, ReadResponse(w, &card))

  // update B status to connecting
  r, w, _ = NewRequest("PUT", "/contact/cards/{cardId}/status", APP_CARDCONNECTING)
  vars = map[string]string{ "cardId": views[0].CardId }
  r = mux.SetURLVars(r, vars)
  SetBearerAuth(r, access[0])
  SetCardStatus(w, r)
  assert.NoError(t, ReadResponse(w, &card))

  // get open message to B
  r, w, _ = NewRequest("GET", "/contact/cards/{cardId}/openMessage", nil)
  vars = map[string]string{ "cardId": views[0].CardId }
  r = mux.SetURLVars(r, vars)
  SetBearerAuth(r, access[0])
  GetOpenMessage(w, r)
  assert.NoError(t, ReadResponse(w, &msg))

  // set open message in B
  r, w, _ = NewRequest("PUT", "/contact/openMessage", msg)
  SetOpenMessage(w, r)
  assert.NoError(t, ReadResponse(w, &contactStatus))
  assert.Equal(t, APP_CARDCONNECTED, contactStatus.Status)

  // card revision incremented
  _, data, _ = ws.ReadMessage()
  assert.NoError(t, json.Unmarshal(data, &revision))
  assert.NotEqual(t, cardRevision, revision.Card)
  cardRevision = revision.Card

  // update B status to connected
  r, w, _ = NewRequest("PUT", "/contact/cards/{cardId}/status?token=" + contactStatus.Token, APP_CARDCONNECTED)
  vars = map[string]string{ "cardId": views[0].CardId }
  r = mux.SetURLVars(r, vars)
  SetBearerAuth(r, access[0])
  SetCardStatus(w, r)
  assert.NoError(t, ReadResponse(w, &card))

}
