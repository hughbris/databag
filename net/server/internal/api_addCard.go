package databag

import (
  "errors"
  "net/http"
  "gorm.io/gorm"
  "github.com/google/uuid"
  "databag/internal/store"
)

func AddCard(w http.ResponseWriter, r *http.Request) {

  account, code, err := BearerAppToken(r, false)
  if err != nil {
    ErrResponse(w, code, err)
    return
  }

  var message DataMessage
  if err := ParseRequest(r, w, &message); err != nil {
    ErrResponse(w, http.StatusBadRequest, err)
    return
  }

  var identity Identity
  guid, messageType, _, err := ReadDataMessage(&message, &identity)
  if messageType != APP_MSGIDENTITY || err != nil {
    ErrResponse(w, http.StatusBadRequest, err)
    return
  }

  var card store.Card
  if err := store.DB.Preload("Groups").Where("account_id = ? AND guid = ?", account.ID, guid).First(&card).Error; err != nil {
    if !errors.Is(err, gorm.ErrRecordNotFound) {
      ErrResponse(w, http.StatusInternalServerError, err)
      return
    }

    // populate new record
    card.CardId = uuid.New().String()
    card.AccountID = account.ID
    card.Guid = guid
    card.Username = identity.Handle
    card.Name = identity.Name
    card.Description = identity.Description
    card.Location = identity.Location
    card.Image = identity.Image
    card.Version = identity.Version
    card.Node = identity.Node
    card.ProfileRevision = identity.Revision
    card.Status = APP_CARDCONFIRMED

  } else {

    if identity.Revision <= card.ProfileRevision {
      WriteResponse(w, getCardModel(&card))
      return
    }

    // update record if revision changed
    card.Username = identity.Handle
    card.Name = identity.Name
    card.Description = identity.Description
    card.Location = identity.Location
    card.Image = identity.Image
    card.Version = identity.Version
    card.Node = identity.Node
    card.ProfileRevision = identity.Revision
  }

  // save contact card
  err  = store.DB.Transaction(func(tx *gorm.DB) error {
    if res := store.DB.Save(&card).Error; res != nil {
      return res
    }
    if res := store.DB.Model(&account).Update("card_revision", account.CardRevision + 1).Error; res != nil {
      return res
    }
    return nil
  })
  if err != nil {
    ErrResponse(w, http.StatusInternalServerError, err)
    return
  }

  SetStatus(account)
  WriteResponse(w, getCardModel(&card))
}

