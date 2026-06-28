package auth

import (
	"fmt"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type jwtClaims struct {
	Email     string `json:"email"`
	Name      string `json:"name"`
	Picture   string `json:"picture"`
	GoogleID  string `json:"googleId"`
	Bootstrap string `json:"bootstrap"`
	jwt.RegisteredClaims
}

// ParseBearer validates an HS256 JWT signed with secret and returns auth claims.
func ParseBearer(tokenString, secret string) (Claims, error) {
	tokenString = strings.TrimSpace(strings.TrimPrefix(tokenString, "Bearer "))
	if tokenString == "" {
		return Claims{}, fmt.Errorf("missing bearer token")
	}
	if strings.TrimSpace(secret) == "" {
		return Claims{}, fmt.Errorf("auth secret not configured")
	}

	parsed, err := jwt.ParseWithClaims(tokenString, &jwtClaims{}, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return Claims{}, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := parsed.Claims.(*jwtClaims)
	if !ok || !parsed.Valid {
		return Claims{}, fmt.Errorf("invalid token claims")
	}

	out := Claims{
		Sub:       claims.Subject,
		Email:     claims.Email,
		Name:      claims.Name,
		Picture:   claims.Picture,
		GoogleID:  claims.GoogleID,
		Bootstrap: claims.Bootstrap == "1",
	}
	if err := out.Validate(); err != nil {
		return Claims{}, err
	}
	return out, nil
}
