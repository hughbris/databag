package databag

import (
  "testing"
  "strconv"
  "github.com/gorilla/mux"
  "github.com/stretchr/testify/assert"
)

func AddTestContacts(t *testing.T, prefix string, count int) []string {

  var access []string
  app := AppData{
    Name: "Appy",
    Description: "A test app",
    Url: "http://app.example.com",
  };

  for i := 0; i < count; i++ {
    var token string
    var login = prefix + strconv.Itoa(i) + ":pass"

    // get account token
    r, w, _ := NewRequest("POST", "/admin/accounts", nil)
    SetBasicAuth(r, "admin:pass")
    AddNodeAccount(w, r)
    assert.NoError(t, ReadResponse(w, &token))

    // set account profile
    r, w, _ = NewRequest("GET", "/account/profile", nil)
    SetBearerAuth(r, token);
    SetCredentials(r, login)
    AddAccount(w, r)
    assert.NoError(t, ReadResponse(w, nil))

    // acquire new token for attaching app
    r, w, _ = NewRequest("POST", "/account/apps", nil)
    SetBasicAuth(r, login);
    AddAccountApp(w, r);
    assert.NoError(t, ReadResponse(w, &token))

    // attach app with token
    r, w, _ = NewRequest("PUT", "/account/apps", &app)
    SetBearerAuth(r, token)
    SetAccountApp(w, r)
    assert.NoError(t, ReadResponse(w, &token))

    access = append(access, token)
  }

  return access
}

func ConnectTestContacts(t *testing.T, accessA string, accessB string) (contact [2]string) {
  var card Card
  var msg DataMessage
  var vars map[string]string
  var contactStatus ContactStatus
  var id string
  access := [2]string{accessA, accessB}

  // get A identity message
  r, w, _ := NewRequest("GET", "/profile/message", nil)
  SetBearerAuth(r, access[0])
  GetProfileMessage(w, r)
  assert.NoError(t, ReadResponse(w, &msg))

  // add A card in B
  r, w, _ = NewRequest("POST", "/contact/cards", &msg)
  SetBearerAuth(r, access[1])
  AddCard(w, r)
  assert.NoError(t, ReadResponse(w, &card))

  // update A status to connecting
  r, w, _ = NewRequest("PUT", "/contact/cards/{cardId}/status", APP_CARDCONNECTING)
  vars = map[string]string{ "cardId": card.CardId }
  r = mux.SetURLVars(r, vars)
  SetBearerAuth(r, access[1])
  SetCardStatus(w, r)
  assert.NoError(t, ReadResponse(w, &card))

  // get open message to A
  r, w, _ = NewRequest("GET", "/contact/cards/{cardId}/openMessage", nil)
  vars = map[string]string{ "cardId": card.CardId }
  r = mux.SetURLVars(r, vars)
  SetBearerAuth(r, access[1])
  GetOpenMessage(w, r)
  assert.NoError(t, ReadResponse(w, &msg))
  id = card.CardId

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

  // update B status to connected
  r, w, _ = NewRequest("PUT", "/contact/cards/{cardId}/status?token=" + contactStatus.Token, APP_CARDCONNECTED)
  vars = map[string]string{ "cardId": views[0].CardId }
  r = mux.SetURLVars(r, vars)
  SetBearerAuth(r, access[0])
  SetCardStatus(w, r)
  assert.NoError(t, ReadResponse(w, &card))

  // extract contact tokens
  contact[0] = card.CardData.Token
  r, w, _ = NewRequest("GET", "/contact/cards/{cardId}", nil)
  vars = map[string]string{ "cardId": id }
  r = mux.SetURLVars(r, vars)
  SetBearerAuth(r, access[1])
  GetCard(w, r)
  assert.NoError(t, ReadResponse(w, &card))
  contact[1] = card.CardData.Token

  return
}