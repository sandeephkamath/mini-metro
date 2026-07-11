package com.lovoctech.trainpuzzle;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // PlayGamesLeaderboardPlugin.java (themes/metro.md §9.6) — a custom plugin
        // local to this app module, not an npm package, so it needs explicit
        // registration here rather than Capacitor's usual node_modules auto-discovery.
        registerPlugin(PlayGamesLeaderboardPlugin.class);
        super.onCreate(savedInstanceState);
        hideSystemBars();
    }

    // Re-applied on every focus regain (returning from background, dismissing a
    // system dialog/permission prompt, or swiping in the system bars — all of which
    // otherwise leave them pinned open indefinitely) — themes/metro.md §6.1.
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.hide(WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(
                    WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
    }
}
