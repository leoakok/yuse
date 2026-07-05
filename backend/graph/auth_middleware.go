package graph

import (
	"context"
	"os"
	"strings"

	"github.com/99designs/gqlgen/graphql"
	"github.com/leo/ai-weekend/backend/internal/scope"
	"github.com/vektah/gqlparser/v2/ast"
)

// AroundOperations requires authentication for all operations except public portfolio reads.
// Unauthenticated GraphQL introspection is blocked in production.
func AroundOperations(ctx context.Context, next graphql.OperationHandler) graphql.ResponseHandler {
	opCtx := graphql.GetOperationContext(ctx)
	if opCtx != nil && isIntrospectionOperation(opCtx) && scope.CV(ctx) == nil {
		if introspectionBlockedInProduction() {
			return func(ctx context.Context) *graphql.Response {
				return graphql.ErrorResponse(ctx, "introspection disabled")
			}
		}
	}
	if opCtx != nil && isPublicGraphQLOperation(opCtx.Operation) {
		return next(ctx)
	}
	if scope.CV(ctx) == nil {
		return func(ctx context.Context) *graphql.Response {
			return graphql.ErrorResponse(ctx, "unauthorized")
		}
	}
	return next(ctx)
}

func introspectionBlockedInProduction() bool {
	env := strings.ToLower(strings.TrimSpace(os.Getenv("NODE_ENV")))
	if env == "production" {
		return true
	}
	if strings.EqualFold(strings.TrimSpace(os.Getenv("VERCEL")), "1") {
		return true
	}
	return strings.EqualFold(strings.TrimSpace(os.Getenv("INTROSPECTION_PUBLIC")), "false")
}

func isIntrospectionOperation(opCtx *graphql.OperationContext) bool {
	if opCtx == nil {
		return false
	}
	if opCtx.Operation != nil {
		for _, sel := range opCtx.Operation.SelectionSet {
			if field, ok := sel.(*ast.Field); ok {
				if field.Name == "__schema" || field.Name == "__type" {
					return true
				}
			}
		}
	}
	lower := strings.ToLower(opCtx.RawQuery)
	return strings.Contains(lower, "__schema") || strings.Contains(lower, "__type")
}

func isPublicGraphQLOperation(op *ast.OperationDefinition) bool {
	if op == nil || op.Operation != ast.Query {
		return false
	}
	if len(op.SelectionSet) != 1 {
		return false
	}
	field, ok := op.SelectionSet[0].(*ast.Field)
	if !ok {
		return false
	}
	switch field.Name {
	case "publicPortfolioWithContent", "publicResumeWithContent":
		return true
	default:
		return false
	}
}
