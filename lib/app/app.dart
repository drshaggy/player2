import 'package:player2/ui/views/start_up/start_up_view.dart';
import 'package:player2/ui/views/tic_tac_toe/tic_tac_toe_view.dart';
import 'package:stacked/stacked_annotations.dart';
import 'package:stacked_services/stacked_services.dart';

@StackedApp(
  routes: [
    MaterialRoute(page: StartUpView, initial: true),
    MaterialRoute(page: TicTacToeView),
  ],
  dependencies: [
    LazySingleton(classType: NavigationService),
  ],
)
class AppSetup {
  /** Serves no purpose besides having an annotation attached to it */
}

// ! Run the following command to generate routing and services

// * flutter pub run build_runner build --delete-conflicting-outputs
