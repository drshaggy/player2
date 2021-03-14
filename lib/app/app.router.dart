// GENERATED CODE - DO NOT MODIFY BY HAND

// **************************************************************************
// StackedRouterGenerator
// **************************************************************************

// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:stacked/stacked.dart';

import '../ui/views/start_up/start_up_view.dart';
import '../ui/views/tic_tac_toe/tic_tac_toe_view.dart';

class Routes {
  static const String startUpView = '/';
  static const String ticTacToeView = '/tic-tac-toe-view';
  static const all = <String>{
    startUpView,
    ticTacToeView,
  };
}

class StackedRouter extends RouterBase {
  @override
  List<RouteDef> get routes => _routes;
  final _routes = <RouteDef>[
    RouteDef(Routes.startUpView, page: StartUpView),
    RouteDef(Routes.ticTacToeView, page: TicTacToeView),
  ];
  @override
  Map<Type, StackedRouteFactory> get pagesMap => _pagesMap;
  final _pagesMap = <Type, StackedRouteFactory>{
    StartUpView: (data) {
      return MaterialPageRoute<dynamic>(
        builder: (context) => const StartUpView(),
        settings: data,
      );
    },
    TicTacToeView: (data) {
      return MaterialPageRoute<dynamic>(
        builder: (context) => const TicTacToeView(),
        settings: data,
      );
    },
  };
}
