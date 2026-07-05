package auth

import "errors"

// ErrMissingBearer is returned when no Authorization bearer token is present.
var ErrMissingBearer = errors.New("missing bearer token")

// IsMissingBearer reports whether err indicates an absent bearer token.
func IsMissingBearer(err error) bool {
	return errors.Is(err, ErrMissingBearer)
}
