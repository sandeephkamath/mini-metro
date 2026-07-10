package com.lovoctech.trainpuzzle;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // PlayGamesLeaderboardPlugin.java (themes/metro.md §9.6) — a custom plugin
        // local to this app module, not an npm package, so it needs explicit
        // registration here rather than Capacitor's usual node_modules auto-discovery.
        registerPlugin(PlayGamesLeaderboardPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
