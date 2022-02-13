package databag

import (
  "errors"
  "net/http"
  "gorm.io/gorm"
  "github.com/gorilla/mux"
  "databag/internal/store"
)

func GetCloseMessage(w http.ResponseWriter, r *http.Request) {

  account, code, res := BearerAppToken(r, true);
  if res != nil {
    ErrResponse(w, code, res)
    return
  }
  detail := account.AccountDetail
  cardId := mux.Vars(r)["cardId"]

  var slot store.CardSlot
  if err := store.DB.Preload("Card").Where("account_id = ? AND card_slot_id = ?", account.ID, cardId).First(&slot).Error; err != nil {
    if !errors.Is(err, gorm.ErrRecordNotFound) {
      ErrResponse(w, http.StatusInternalServerError, err)
    } else {
      ErrResponse(w, http.StatusNotFound, err)
    }
    return
  }
  if slot.Card == nil {
    ErrResponse(w, http.StatusNotFound, errors.New("card has been deleted"))
    return
  }

  if slot.Card.Status == APP_CARDCONNECTING || slot.Card.Status == APP_CARDCONNECTED {
    ErrResponse(w, http.StatusMethodNotAllowed, errors.New("invalid card state"))
    return
  }

  disconnect := &Disconnect{
    Contact: slot.Card.Guid,
  }

  msg, err := WriteDataMessage(detail.PrivateKey, detail.PublicKey, detail.KeyType,
    APP_SIGNPKCS1V15, account.Guid, APP_MSGDISCONNECT, &disconnect)
  if err != nil {
    ErrResponse(w, http.StatusInternalServerError, err)
    return
  }

  WriteResponse(w, msg)
}

