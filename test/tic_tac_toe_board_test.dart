import 'package:flutter_test/flutter_test.dart';
import 'package:player2/models/boards/move.dart';
import 'package:player2/models/boards/tic_tac_toe_board.dart';
import 'package:player2/helpers/helper_functions.dart';
import 'package:player2/models/boards/tic_tac_toe_move.dart';

void main() {
  group('TicTacToeBoardTest -', () {
    group('checkWinCondition() -', () {
      test('Checks if listTo2dArray() works correctly', () {
        TicTacToeBoard board = new TicTacToeBoard.position('012012012');
        expect(listTo2dArray(board.positionAsList, [3, 3]), [
          [0, 1, 2],
          [0, 1, 2],
          [0, 1, 2],
        ]);
        board = new TicTacToeBoard.position('110211020');
        expect(listTo2dArray(board.positionAsList, [3, 3]), [
          [1, 1, 0],
          [2, 1, 1],
          [0, 2, 0],
        ]);
      });

      test('Check if checkWinCondition() returns 0 if no outcome decided yet',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('012012201');
        double result = board.checkWinCondition();
        expect(result, 0);
      });

      test(
          'Check if checkWinCondition() returns 1 if player 1 wins horizontally on row 1',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('111220200');
        double result = board.checkWinCondition();
        expect(result, 1);
      });
      test(
          'Check if checkWinCondition() returns 1 if player 1 wins horizontally on row 2',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('220111200');
        double result = board.checkWinCondition();
        expect(result, 1);
      });
      test(
          'Check if checkWinCondition() returns 1 if player 1 wins horizontally on row 3',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('200220111');
        double result = board.checkWinCondition();
        expect(result, 1);
      });
      test(
          'Check if checkWinCondition() returns 1 if player 1 wins vertically on column 1',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('102120112');
        double result = board.checkWinCondition();
        expect(result, 1);
      });
      test(
          'Check if checkWinCondition() returns 1 if player 1 wins vertically on column 2',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('212110212');
        double result = board.checkWinCondition();
        expect(result, 1);
      });
      test(
          'Check if checkWinCondition() returns 1 if player 1 wins vertically on column 3',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('221101221');
        double result = board.checkWinCondition();
        expect(result, 1);
      });

      test(
          'Check if checkWinCondition() returns 2 if player 2 wins horizontally on row 1',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('222101010');
        double result = board.checkWinCondition();
        expect(result, 2);
      });
      test(
          'Check if checkWinCondition() returns 2 if player 2 wins horizontally on row 2',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('101222010');
        double result = board.checkWinCondition();
        expect(result, 2);
      });
      test(
          'Check if checkWinCondition() returns 2 if player 2 wins horizontally on row 3',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('101010222');
        double result = board.checkWinCondition();
        expect(result, 2);
      });
      test(
          'Check if checkWinCondition() returns 2 if player 2 wins vertically on column 1',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('211201212');
        double result = board.checkWinCondition();
        expect(result, 2);
      });
      test(
          'Check if checkWinCondition() returns 2 if player 2 wins vertically on column 2',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('121120122');
        double result = board.checkWinCondition();
        expect(result, 2);
      });
      test(
          'Check if checkWinCondition() returns 2 if player 2 wins vertically on column 3',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('112102122');
        double result = board.checkWinCondition();
        expect(result, 2);
      });
      test(
          'Check if checkWinCondition() returns 1 if player 1 wins diagonally forward',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('120012021');
        double result = board.checkWinCondition();
        expect(result, 1);
      });
      test(
          'Check if checkWinCondition() returns 1 if player 1 wins diagonally backward',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('021012120');
        double result = board.checkWinCondition();
        expect(result, 1);
      });
      test(
          'Check if checkWinCondition() returns 2 if player 2 wins diagonally forward',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('210021012');
        double result = board.checkWinCondition();
        expect(result, 2);
      });
      test(
          'Check if checkWinCondition() returns 2 if player 2 wins diagonally backward',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('012021210');
        double result = board.checkWinCondition();
        expect(result, 2);
      });
      test('Check if checkWinCondition() returns 0.5 if players draw', () {
        TicTacToeBoard board = new TicTacToeBoard.position('121121212');
        double result = board.checkWinCondition();
        expect(result, 0.5);
      });
    });
    group('makeMove() -', () {
      test('Player 1 make a move from starting position correctly', () {
        TicTacToeBoard board = new TicTacToeBoard.position('000000000');
        Move move = new TicTacToeMove(1, 0);
        TicTacToeBoard newBoard = board.makeMove(move);
        expect(newBoard.position, "100000000");
      });
      test(
          'Player 1 and the Player 2 makes a move each from starting position correctly',
          () {
        TicTacToeBoard board = new TicTacToeBoard.position('000000000');
        Move move = new TicTacToeMove(1, 0);
        TicTacToeBoard newBoard = board.makeMove(move);
        expect(newBoard.position, "100000000");
        move = new TicTacToeMove(2, 2);
        newBoard = newBoard.makeMove(move);
        expect(newBoard.position, "102000000");
      });
      test('PlayerTurn is changed successfully on each go', () {
        TicTacToeBoard board = new TicTacToeBoard.position('000000000');
        expect(board.playerTurn, 1);
        Move move = new TicTacToeMove(1, 0);
        board = board.makeMove(move);
        expect(board.playerTurn, 2);
        move = new TicTacToeMove(2, 2);
        board = board.makeMove(move);
        expect(board.playerTurn, 1);
      });
      test('Throws exception when player 2 tries to make illegal move', () {
        TicTacToeBoard board = new TicTacToeBoard.position('000000000');
        Move move = new TicTacToeMove(1, 0);
        TicTacToeBoard newBoard = board.makeMove(move);
        expect(newBoard.position, "100000000");
        move = new TicTacToeMove(2, 0);
        try {
          newBoard = newBoard.makeMove(move);
        } on AssertionError catch (e) {
          expect(e.message, 'Illegal Move, piece in position');
        }
      });
    });
    group('Board.copy() Constructor -', () {
      test('Board.copy creates a matching but new object', () {
        TicTacToeBoard board = new TicTacToeBoard.position("010000000");
        TicTacToeBoard newBoard = TicTacToeBoard.copy(board);
        expect(newBoard, isNot(board));
        expect(newBoard.position, board.position);
        expect(newBoard.moves, board.moves);
        expect(newBoard.playerTurn, board.playerTurn);
      });
    });
    group('calculatePlayerTurn() -', () {
      test('Calculate player turn on starting position, should be 1', () {
        TicTacToeBoard board = new TicTacToeBoard.position("000000000");
        expect(board.playerTurn, 1);
      });
      test('Calculate player turn on player 2s turn, should be 2', () {
        TicTacToeBoard board = new TicTacToeBoard.position("100000000");
        expect(board.playerTurn, 2);
      });
      test('Calculate player turn on player 1s turn, should be 1', () {
        TicTacToeBoard board = new TicTacToeBoard.position("120000000");
        expect(board.playerTurn, 1);
      });
      test('Calculate player turn on player 2s turn, should be 2', () {
        TicTacToeBoard board = new TicTacToeBoard.position("121000000");
        expect(board.playerTurn, 2);
      });
      test('Calculate player turn on player 1s turn, should be 1', () {
        TicTacToeBoard board = new TicTacToeBoard.position("121200000");
        expect(board.playerTurn, 1);
      });
      test('Calculate player turn on player 2s turn, should be 2', () {
        TicTacToeBoard board = new TicTacToeBoard.position("121210000");
        expect(board.playerTurn, 2);
      });
      test('Calculate player turn on player 1s turn, should be 1', () {
        TicTacToeBoard board = new TicTacToeBoard.position("121212000");
        expect(board.playerTurn, 1);
      });
      test('Calculate player turn on player 2s turn, should be 2', () {
        TicTacToeBoard board = new TicTacToeBoard.position("121212200");
        expect(board.playerTurn, 2);
      });
      test('Calculate player turn on player 1s turn, should be 1', () {
        TicTacToeBoard board = new TicTacToeBoard.position("121212210");
        expect(board.playerTurn, 1);
      });
      test('Calculate player turn on player 2s turn, should be 2', () {
        TicTacToeBoard board = new TicTacToeBoard.position("121212212");
        expect(board.playerTurn, 2);
      });
    });
  });
}
