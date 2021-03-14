import 'package:player2/app/app.locator.dart';
import 'package:player2/app/app.router.dart';
import 'package:stacked/stacked.dart';
import 'package:stacked_services/stacked_services.dart';

class StartUpViewModel extends BaseViewModel {
  final NavigationService _navigationService = locator<NavigationService>();

  void initialise() {
    startUpLogic();
  }

  void startUpLogic() async {
    await Future.delayed(Duration(microseconds: 200));
    await _navigationService.clearStackAndShow(Routes.ticTacToeView);
  }
}
