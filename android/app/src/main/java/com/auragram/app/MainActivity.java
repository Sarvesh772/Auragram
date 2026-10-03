package com.auragram.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import androidx.core.view.WindowCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Color.WHITE);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        View webView = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, insets) -> {
            int topInset = insets.getInsets(WindowInsetsCompat.Type.statusBars()).top;
            view.setPadding(view.getPaddingLeft(), topInset, view.getPaddingRight(), view.getPaddingBottom());
            return insets;
        });
        ViewCompat.requestApplyInsets(webView);
    }
}
