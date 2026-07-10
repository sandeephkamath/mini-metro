package com.lovoctech.trainpuzzle;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.util.Log;
import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.PlayGamesAuthProvider;
import com.google.firebase.firestore.AggregateSource;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FieldValue;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.Query;

import java.util.HashMap;
import java.util.Map;

// Production Leaderboard identity on Android (themes/metro.md §9.6): Play Games
// Sign-In, bridged into a native Firebase Auth session via PlayGamesAuthProvider.
// Everything below (sign-in, submit, rank/total/top-N reads) runs against the native
// Firebase Auth/Firestore SDKs rather than the JS SDK already used on web — the
// JS-side Firebase SDK running inside the WebView has no visibility into this
// native-only session, and Firestore Security Rules require request.auth to be
// populated for every one of these operations (firestore.rules), so there's no way
// to do the reads/writes from JS once identity comes from Play Games.
//
// Matches firebase/leaderboard.ts's shape and its two failure-handling styles:
// signIn/submitScore swallow errors and resolve with a "not available" result (no
// error UI is spec'd for either); the read methods (fetchOwnRank/fetchTotalPlayers/
// fetchTopN) reject on failure so the caller can distinguish "empty" from "failed".
@CapacitorPlugin(name = "PlayGamesLeaderboard")
public class PlayGamesLeaderboardPlugin extends Plugin {
    private static final String LEADERBOARD_COLLECTION = "leaderboard";

    @Override
    public void load() {
        PlayGamesSdk.initialize(getContext());
    }

    // Silent only (core/meta_progression.md §7-8, metro.md §9.6: "no prompt or button
    // ever shown") — isAuthenticated() never shows UI; if it comes back false, this
    // resolves signedIn:false rather than falling back to a UI-driven sign-in call.
    private static final String TAG = "PlayGamesLeaderboard";

    @PluginMethod
    public void signIn(PluginCall call) {
        GamesSignInClient signInClient = PlayGames.getGamesSignInClient(getActivity());
        signInClient.isAuthenticated().addOnCompleteListener(isAuthTask -> {
            boolean authenticated = isAuthTask.isSuccessful() && isAuthTask.getResult().isAuthenticated();
            Log.d(TAG, "isAuthenticated: successful=" + isAuthTask.isSuccessful()
                + " authenticated=" + authenticated
                + (isAuthTask.isSuccessful() ? "" : " exception=" + isAuthTask.getException()));
            if (!authenticated) {
                resolveNotSignedIn(call);
                return;
            }
            String webClientId = BuildConfig.PLAY_GAMES_WEB_CLIENT_ID;
            Log.d(TAG, "webClientId empty? " + (webClientId == null || webClientId.isEmpty()));
            if (webClientId == null || webClientId.isEmpty()) {
                resolveNotSignedIn(call);
                return;
            }
            signInClient.requestServerSideAccess(webClientId, false)
                .addOnSuccessListener(authCode -> {
                    Log.d(TAG, "requestServerSideAccess success, authCode length=" + (authCode != null ? authCode.length() : -1));
                    AuthCredential credential = PlayGamesAuthProvider.getCredential(authCode);
                    FirebaseAuth.getInstance().signInWithCredential(credential)
                        .addOnSuccessListener(authResult -> {
                            FirebaseUser user = authResult.getUser();
                            Log.d(TAG, "signInWithCredential success, user=" + (user != null ? user.getUid() : "null"));
                            if (user == null) {
                                resolveNotSignedIn(call);
                                return;
                            }
                            JSObject result = new JSObject();
                            result.put("signedIn", true);
                            result.put("uid", user.getUid());
                            result.put("displayName", user.getDisplayName() != null ? user.getDisplayName() : "Player");
                            call.resolve(result);
                        })
                        .addOnFailureListener(e -> {
                            Log.w(TAG, "signInWithCredential failed", e);
                            resolveNotSignedIn(call);
                        });
                })
                .addOnFailureListener(e -> {
                    Log.w(TAG, "requestServerSideAccess failed", e);
                    resolveNotSignedIn(call);
                });
        });
    }

    private void resolveNotSignedIn(PluginCall call) {
        JSObject result = new JSObject();
        result.put("signedIn", false);
        call.resolve(result);
    }

    // The client never needs to compare against a previous value first (core §7) —
    // Firestore Security Rules (firestore.rules) are what actually reject a
    // regressing or out-of-range submission.
    @PluginMethod
    public void submitScore(PluginCall call) {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null) {
            call.resolve();
            return;
        }
        String displayName = call.getString("displayName", user.getDisplayName() != null ? user.getDisplayName() : "Player");
        double weeksSurvived = call.getData().optDouble("weeksSurvived", 0);

        Map<String, Object> data = new HashMap<>();
        data.put("displayName", displayName);
        data.put("weeksSurvived", weeksSurvived);
        data.put("updatedAt", FieldValue.serverTimestamp());

        FirebaseFirestore.getInstance().collection(LEADERBOARD_COLLECTION).document(user.getUid())
            .set(data)
            .addOnCompleteListener(task -> call.resolve());
    }

    // Rank = 1 + count of players strictly ahead — an aggregation query, not a
    // dedicated server, per the "no server" architecture (memo.md § Leaderboard).
    @PluginMethod
    public void fetchOwnRank(PluginCall call) {
        double weeksSurvived = call.getData().optDouble("weeksSurvived", 0);
        FirebaseFirestore.getInstance().collection(LEADERBOARD_COLLECTION)
            .whereGreaterThan("weeksSurvived", weeksSurvived)
            .count()
            .get(AggregateSource.SERVER)
            .addOnSuccessListener(snap -> {
                JSObject result = new JSObject();
                result.put("rank", snap.getCount() + 1);
                call.resolve(result);
            })
            .addOnFailureListener(e -> call.reject(e.getMessage(), e));
    }

    // For "#4,382 of 61,203 players" (metro.md §9.6 game-over display).
    @PluginMethod
    public void fetchTotalPlayers(PluginCall call) {
        FirebaseFirestore.getInstance().collection(LEADERBOARD_COLLECTION)
            .count()
            .get(AggregateSource.SERVER)
            .addOnSuccessListener(snap -> {
                JSObject result = new JSObject();
                result.put("count", snap.getCount());
                call.resolve(result);
            })
            .addOnFailureListener(e -> call.reject(e.getMessage(), e));
    }

    @PluginMethod
    public void fetchOwnEntry(PluginCall call) {
        String uid = call.getString("uid");
        if (uid == null) {
            call.reject("uid required");
            return;
        }
        FirebaseFirestore.getInstance().collection(LEADERBOARD_COLLECTION).document(uid)
            .get()
            .addOnSuccessListener(doc -> {
                JSObject result = new JSObject();
                if (!doc.exists()) {
                    result.put("found", false);
                    call.resolve(result);
                    return;
                }
                result.put("found", true);
                result.put("uid", doc.getId());
                result.put("displayName", doc.getString("displayName"));
                result.put("weeksSurvived", doc.getDouble("weeksSurvived"));
                call.resolve(result);
            })
            .addOnFailureListener(e -> call.reject(e.getMessage(), e));
    }

    @PluginMethod
    public void fetchTopN(PluginCall call) {
        int n = call.getInt("n", 50);
        FirebaseFirestore.getInstance().collection(LEADERBOARD_COLLECTION)
            .orderBy("weeksSurvived", Query.Direction.DESCENDING)
            .limit(n)
            .get()
            .addOnSuccessListener(snap -> {
                JSArray entries = new JSArray();
                for (DocumentSnapshot doc : snap.getDocuments()) {
                    JSObject entry = new JSObject();
                    entry.put("uid", doc.getId());
                    entry.put("displayName", doc.getString("displayName"));
                    entry.put("weeksSurvived", doc.getDouble("weeksSurvived"));
                    entries.put(entry);
                }
                JSObject result = new JSObject();
                result.put("entries", entries);
                call.resolve(result);
            })
            .addOnFailureListener(e -> call.reject(e.getMessage(), e));
    }
}
