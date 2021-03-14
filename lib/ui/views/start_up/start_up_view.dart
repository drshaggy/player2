import 'package:flutter/material.dart';
import 'package:player2/ui/views/start_up/start_up_view_model.dart';
import 'package:stacked/stacked.dart';

class StartUpView extends StatelessWidget {
  const StartUpView({Key key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<StartUpViewModel>.reactive(
      onModelReady: (model) => model.initialise(),
      builder: (context, model, child) => Scaffold(),
      viewModelBuilder: () => StartUpViewModel(),
    );
  }
}
