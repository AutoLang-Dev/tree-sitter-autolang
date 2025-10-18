import XCTest
import SwiftTreeSitter
import TreeSitterAutolang

final class TreeSitterAutolangTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_autolang())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading AutoLang grammar")
    }
}
