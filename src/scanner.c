#include "tree_sitter/alloc.h"
#include "tree_sitter/array.h"
#include "tree_sitter/parser.h"

enum TokenType {
  LLVM_IR,
};

typedef struct {

} Scanner;

void *tree_sitter_autolang_external_scanner_create() {
  return ts_calloc(1, sizeof(Scanner));
}

void tree_sitter_autolang_external_scanner_destroy(void *payload) {
  ts_free((Scanner *)payload);
}

unsigned tree_sitter_autolang_external_scanner_serialize(void *payload,
                                                         char *buffer) {
  return 0;
}

void tree_sitter_autolang_external_scanner_deserialize(void *payload,
                                                       const char *buffer,
                                                       unsigned length) {}

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

bool tree_sitter_autolang_external_scanner_scan(void *payload, TSLexer *lexer,
                                                const bool *valid_symbols) {
  if (valid_symbols[LLVM_IR]) {
    int depth = 0;
    for (;; advance(lexer)) {
      if (lexer->eof(lexer)) {
        return false;
      }
      if (lexer->lookahead == '"') {
        do {
          advance(lexer);
        } while (lexer->lookahead != '"');
      } else if (lexer->lookahead == ';') {
        do {
          advance(lexer);
        } while (lexer->lookahead != '\n');
      } else if (lexer->lookahead == '{') {
        ++depth;
      } else if (lexer->lookahead == '}') {
        if (depth == 0) {
          lexer->result_symbol = LLVM_IR;
          lexer->mark_end(lexer);
          return true;
        } else {
          --depth;
        }
      }
    }
  }
  return false;
}
