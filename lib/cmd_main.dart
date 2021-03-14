import 'package:player2/models/boards/board.dart';
import 'package:player2/models/boards/tic_tac_toe_board.dart';
import 'package:player2/monte_carlo_tree_search.dart';

void main() {
  print("Starting Monte Carlo Tree Search");
  TicTacToeBoard board = new TicTacToeBoard();
  Duration duration = Duration(seconds: 10);
  MonteCarloTreeSearch mcts = MonteCarloTreeSearch(board, duration);

  print("Finished Monte Carlo Tree Search");
}
