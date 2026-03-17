import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'screens/map_screen.dart';
import 'screens/trains_screen.dart';
import 'providers/train_provider.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => TrainProvider()..init(),
      child: const OpenRailTrackerApp(),
    ),
  );
}

class OpenRailTrackerApp extends StatelessWidget {
  const OpenRailTrackerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OpenRailTracker',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.dark,
      theme: _buildTheme(Brightness.light),
      darkTheme: _buildTheme(Brightness.dark),
      home: const _RootNav(),
    );
  }

  ThemeData _buildTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFFFCCC0A),
        brightness: brightness,
      ),
      scaffoldBackgroundColor: isDark ? const Color(0xFF0A0A0A) : Colors.white,
      cardColor: isDark ? const Color(0xFF1A1A1A) : Colors.white,
      appBarTheme: AppBarTheme(
        backgroundColor: isDark ? const Color(0xFF111111) : Colors.white,
        foregroundColor: isDark ? Colors.white : Colors.black87,
        elevation: 0,
        scrolledUnderElevation: 1,
      ),
    );
  }
}

class _RootNav extends StatefulWidget {
  const _RootNav();

  @override
  State<_RootNav> createState() => _RootNavState();
}

class _RootNavState extends State<_RootNav> {
  int _index = 0;

  static const _screens = [
    MapScreen(),
    TrainsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.map_outlined),
            selectedIcon: Icon(Icons.map),
            label: 'Map',
          ),
          NavigationDestination(
            icon: Icon(Icons.train_outlined),
            selectedIcon: Icon(Icons.train),
            label: 'Trains',
          ),
        ],
      ),
    );
  }
}

