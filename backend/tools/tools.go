//go:build tools

package tools

//go:generate go run github.com/99designs/gqlgen generate

import (
	_ "github.com/99designs/gqlgen"
	_ "github.com/urfave/cli/v2"
	_ "golang.org/x/text/cases"
	_ "golang.org/x/text/language"
	_ "golang.org/x/tools/go/ast/astutil"
	_ "golang.org/x/tools/go/packages"
	_ "golang.org/x/tools/imports"
)
