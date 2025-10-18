package tree_sitter_autolang_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_autolang "github.com/autolang-dev/tree-sitter-autolang/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_autolang.Language())
	if language == nil {
		t.Errorf("Error loading AutoLang grammar")
	}
}
