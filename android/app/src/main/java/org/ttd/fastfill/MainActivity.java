package org.ttd.fastfill;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputFilter;
import android.text.InputType;
import android.view.LayoutInflater;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.SwitchCompat;
import androidx.core.content.ContextCompat;

import com.google.android.material.button.MaterialButton;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private static final String PREFS_NAME = "TTDFastFillPrefs";
    private static final String KEY_DEVOTEES_JSON = "ttd_devotees_json";
    private static final String DEFAULT_URL = "https://ttdevasthanams.ap.gov.in/";
    private static final int MAX_ACTIVE_DEVOTEES = 6;

    private WebView webView;
    private ProgressBar progressBar;
    private TextView tvStatus;
    private MaterialButton btnFastFill;
    private MaterialButton btnSettings;
    private MaterialButton btnReload;

    private SharedPreferences prefs;
    private String coreFillerScript = "";

    public static class Devotee {
        public String name;
        public String age;
        public String gender;
        public String idType;
        public String idNumber;
        public boolean active;

        public Devotee(String name, String age, String gender, String idType, String idNumber, boolean active) {
            this.name = name;
            this.age = age;
            this.gender = gender;
            this.idType = idType;
            this.idNumber = idNumber;
            this.active = active;
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        initDefaultPrefsIfNeeded();

        webView = findViewById(R.id.web_view);
        progressBar = findViewById(R.id.progress_bar);
        tvStatus = findViewById(R.id.tv_status);
        btnFastFill = findViewById(R.id.btn_fastfill);
        btnSettings = findViewById(R.id.btn_settings);
        btnReload = findViewById(R.id.btn_reload);

        loadCoreFillerAsset();
        setupWebView();

        btnFastFill.setOnClickListener(v -> triggerFastFill());
        btnSettings.setOnClickListener(v -> showDevoteesDialog());
        btnReload.setOnClickListener(v -> webView.reload());

        webView.loadUrl(DEFAULT_URL);
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString().replace("; wv", ""));

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                progressBar.setVisibility(View.VISIBLE);
                tvStatus.setText("Connecting: " + extractHost(url));
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
                CookieManager.getInstance().flush();
                updateReadyStatus();
                injectCoreFiller();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                if (newProgress == 100) {
                    progressBar.setVisibility(View.GONE);
                }
            }
        });
    }

    private void updateReadyStatus() {
        List<Devotee> list = loadDevoteesFromPrefs();
        int activeCount = 0;
        for (Devotee d : list) {
            if (d.active) activeCount++;
        }
        tvStatus.setText("Ready • " + activeCount + " Devotee(s) Selected (Max 6)");
    }

    private void loadCoreFillerAsset() {
        try {
            InputStream is = getAssets().open("core-filler.js");
            BufferedReader reader = new BufferedReader(new InputStreamReader(is));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            reader.close();
            coreFillerScript = sb.toString();
        } catch (Exception e) {
            coreFillerScript = "";
        }
    }

    private void injectCoreFiller() {
        if (!coreFillerScript.isEmpty()) {
            webView.evaluateJavascript(coreFillerScript, null);
        }
    }

    private void triggerFastFill() {
        List<Devotee> allDevotees = loadDevoteesFromPrefs();
        List<Devotee> activeOnly = new ArrayList<>();
        for (Devotee d : allDevotees) {
            if (d.active) {
                activeOnly.add(d);
                if (activeOnly.size() == MAX_ACTIVE_DEVOTEES) break;
            }
        }

        if (activeOnly.isEmpty()) {
            Toast.makeText(this, "⚠️ No devotees are selected as 'Going'. Tap Devotees to pick who travels.", Toast.LENGTH_LONG).show();
            tvStatus.setText("⚠️ Please select at least 1 devotee");
            return;
        }

        tvStatus.setText(R.string.status_filling);
        btnFastFill.setEnabled(false);

        try {
            JSONObject config = new JSONObject();
            config.put("autoAdvance", true);
            config.put("agreeTerms", true);
            config.put("hapticChime", true);

            JSONObject address = new JSONObject();
            address.put("email", prefs.getString("email", "devotee@gmail.com"));
            address.put("city", prefs.getString("city", "Bengaluru"));
            address.put("state", prefs.getString("state", "Karnataka"));
            address.put("country", "India");
            address.put("pincode", prefs.getString("pincode", "560001"));
            config.put("address", address);

            JSONArray devoteesArray = new JSONArray();
            for (Devotee d : activeOnly) {
                JSONObject obj = new JSONObject();
                obj.put("name", d.name);
                obj.put("age", d.age);
                obj.put("gender", d.gender);
                obj.put("idType", d.idType);
                obj.put("idNumber", d.idNumber);
                devoteesArray.put(obj);
            }
            config.put("devotees", devoteesArray);

            String jsToRun = "(function() {\n" +
                    "  try {\n" +
                    "    var filler = window.TTDFastFiller || (window.TTDFastFillCore ? {\n" +
                    "      fillAll: function(c) {\n" +
                    "        return window.TTDFastFillCore.executeAutonomousRun(c.devotees, c.address, { autoCheckAgreements: c.agreeTerms !== false, autoClickContinue: c.autoAdvance !== false });\n" +
                    "      }\n" +
                    "    } : null);\n" +
                    "    if (!filler) {\n" +
                    "      window.AndroidBridge.onFillResult(false, 'Engine not ready or not on TTD page.', 0, 0);\n" +
                    "      return;\n" +
                    "    }\n" +
                    "    var payload = " + config.toString() + ";\n" +
                    "    filler.fillAll(payload).then(function(res) {\n" +
                    "      var count = res.devoteesFilled !== undefined ? res.devoteesFilled : (res.pilgrimsFilled || 0);\n" +
                    "      var dur = res.duration !== undefined ? res.duration : (res.timeTakenMs || 0);\n" +
                    "      window.AndroidBridge.onFillResult(res.success, res.message || '', count, dur);\n" +
                    "    }).catch(function(err) {\n" +
                    "      window.AndroidBridge.onFillResult(false, err.message, 0, 0);\n" +
                    "    });\n" +
                    "  } catch(e) {\n" +
                    "    window.AndroidBridge.onFillResult(false, e.toString(), 0, 0);\n" +
                    "  }\n" +
                    "})();";

            webView.evaluateJavascript(jsToRun, null);

        } catch (Exception e) {
            tvStatus.setText("Error preparing data: " + e.getMessage());
            btnFastFill.setEnabled(true);
        }

        new Handler(Looper.getMainLooper()).postDelayed(() -> btnFastFill.setEnabled(true), 2500);
    }

    private void showDevoteesDialog() {
        LayoutInflater inflater = getLayoutInflater();
        View dialogView = inflater.inflate(R.layout.dialog_devotees, null);

        AlertDialog dialog = new AlertDialog.Builder(this, R.style.Theme_TTDFastFill_Dialog)
                .setView(dialogView)
                .setCancelable(true)
                .create();

        TextView tvActiveCount = dialogView.findViewById(R.id.tv_active_count);
        Button btnToggleSelection = dialogView.findViewById(R.id.btn_toggle_selection);
        Button btnAddDevotee = dialogView.findViewById(R.id.btn_add_devotee);
        LinearLayout container = dialogView.findViewById(R.id.ll_devotees_container);

        EditText etEmail = dialogView.findViewById(R.id.et_email);
        EditText etCity = dialogView.findViewById(R.id.et_city);
        EditText etState = dialogView.findViewById(R.id.et_state);
        EditText etPincode = dialogView.findViewById(R.id.et_pincode);

        Button btnCancel = dialogView.findViewById(R.id.btn_dialog_cancel);
        Button btnSave = dialogView.findViewById(R.id.btn_dialog_save);

        etEmail.setText(prefs.getString("email", "devotee@gmail.com"));
        etCity.setText(prefs.getString("city", "Bengaluru"));
        etState.setText(prefs.getString("state", "Karnataka"));
        etPincode.setText(prefs.getString("pincode", "560001"));

        List<Devotee> devoteeList = loadDevoteesFromPrefs();

        final String[] genders = new String[]{"Male", "Female", "Transgender"};
        final String[] idTypes = new String[]{"Aadhaar Card", "Voter ID", "Passport"};

        Runnable refreshUI = new Runnable() {
            @Override
            public void run() {
                container.removeAllViews();
                int currentActive = 0;
                for (Devotee d : devoteeList) {
                    if (d.active) currentActive++;
                }

                tvActiveCount.setText(currentActive + " / " + MAX_ACTIVE_DEVOTEES + " Selected");
                btnToggleSelection.setText(currentActive > 0 ? "Deselect All" : "⚡ Select First 6");

                for (int i = 0; i < devoteeList.size(); i++) {
                    final int idx = i;
                    Devotee d = devoteeList.get(i);
                    View cardView = inflater.inflate(R.layout.item_devotee_card, container, false);

                    TextView tvBadge = cardView.findViewById(R.id.tv_devotee_badge);
                    TextView tvTitle = cardView.findViewById(R.id.tv_devotee_title);
                    TextView tvGoingStatus = cardView.findViewById(R.id.tv_going_status);
                    SwitchCompat switchGoing = cardView.findViewById(R.id.switch_going);
                    ImageButton btnDelete = cardView.findViewById(R.id.btn_delete);
                    EditText etName = cardView.findViewById(R.id.et_name);
                    EditText etAge = cardView.findViewById(R.id.et_age);
                    Spinner spGender = cardView.findViewById(R.id.sp_gender);
                    Spinner spIdType = cardView.findViewById(R.id.sp_id_type);
                    TextView tvIdNumberLabel = cardView.findViewById(R.id.tv_id_number_label);
                    EditText etIdNumber = cardView.findViewById(R.id.et_id_number);
                    TextView tvIdHelper = cardView.findViewById(R.id.tv_id_helper);

                    tvBadge.setText("#" + (idx + 1));
                    tvTitle.setText(d.name.isEmpty() ? "Devotee #" + (idx + 1) : d.name);
                    switchGoing.setChecked(d.active);

                    if (d.active) {
                        tvGoingStatus.setText("Going");
                        tvGoingStatus.setTextColor(ContextCompat.getColor(MainActivity.this, R.color.green_travel));
                    } else {
                        tvGoingStatus.setText("Not Going");
                        tvGoingStatus.setTextColor(ContextCompat.getColor(MainActivity.this, R.color.text_secondary));
                    }

                    etName.setText(d.name);
                    etAge.setText(d.age);
                    etIdNumber.setText(d.idNumber);

                    // Gender Adapter
                    ArrayAdapter<String> genderAdapter = new ArrayAdapter<>(MainActivity.this, android.R.layout.simple_spinner_dropdown_item, genders);
                    spGender.setAdapter(genderAdapter);
                    int gPos = 0;
                    for (int g = 0; g < genders.length; g++) {
                        if (genders[g].equalsIgnoreCase(d.gender)) { gPos = g; break; }
                    }
                    spGender.setSelection(gPos);

                    // ID Type Adapter
                    ArrayAdapter<String> idAdapter = new ArrayAdapter<>(MainActivity.this, android.R.layout.simple_spinner_dropdown_item, idTypes);
                    spIdType.setAdapter(idAdapter);
                    int idPos = 0;
                    for (int id = 0; id < idTypes.length; id++) {
                        if (idTypes[id].equalsIgnoreCase(d.idType)) { idPos = id; break; }
                    }
                    spIdType.setSelection(idPos);

                    // Configure ID Proof field based on selected ID Type (Enforces 12-digit Aadhaar limit!)
                    applyIdTypeRules(d.idType, tvIdNumberLabel, etIdNumber, tvIdHelper);

                    spIdType.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
                        @Override
                        public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                            String selectedType = idTypes[position];
                            devoteeList.get(idx).idType = selectedType;
                            applyIdTypeRules(selectedType, tvIdNumberLabel, etIdNumber, tvIdHelper);
                        }

                        @Override
                        public void onNothingSelected(AdapterView<?> parent) {}
                    });

                    // Strict max 6 selection restriction
                    switchGoing.setOnCheckedChangeListener((buttonView, isChecked) -> {
                        if (isChecked) {
                            int activeCount = 0;
                            for (int k = 0; k < devoteeList.size(); k++) {
                                if (k == idx) continue;
                                if (devoteeList.get(k).active) activeCount++;
                            }
                            if (activeCount >= MAX_ACTIVE_DEVOTEES) {
                                switchGoing.setChecked(false);
                                Toast.makeText(MainActivity.this, "⚠️ Maximum " + MAX_ACTIVE_DEVOTEES + " devotees allowed by TTD per booking. Please turn off another devotee first.", Toast.LENGTH_SHORT).show();
                                return;
                            }
                        }
                        devoteeList.get(idx).active = isChecked;
                        saveCurrentCardInputs(container, devoteeList);
                        run();
                    });

                    // Delete button
                    if (devoteeList.size() <= 1) {
                        btnDelete.setVisibility(View.GONE);
                    } else {
                        btnDelete.setVisibility(View.VISIBLE);
                        btnDelete.setOnClickListener(v -> {
                            saveCurrentCardInputs(container, devoteeList);
                            devoteeList.remove(idx);
                            run();
                        });
                    }

                    container.addView(cardView);
                }
            }
        };

        refreshUI.run();

        // Add devotee button (Unlimited pool allowed!)
        btnAddDevotee.setOnClickListener(v -> {
            saveCurrentCardInputs(container, devoteeList);
            int currentActive = 0;
            for (Devotee d : devoteeList) {
                if (d.active) currentActive++;
            }
            devoteeList.add(new Devotee("", "", "Male", "Aadhaar Card", "", currentActive < MAX_ACTIVE_DEVOTEES));
            refreshUI.run();
        });

        // Quick selection button
        btnToggleSelection.setOnClickListener(v -> {
            saveCurrentCardInputs(container, devoteeList);
            int currentActive = 0;
            for (Devotee d : devoteeList) {
                if (d.active) currentActive++;
            }

            if (currentActive > 0) {
                for (Devotee d : devoteeList) d.active = false;
            } else {
                int count = 0;
                for (Devotee d : devoteeList) {
                    if (count < MAX_ACTIVE_DEVOTEES) {
                        d.active = true;
                        count++;
                    } else {
                        d.active = false;
                    }
                }
            }
            refreshUI.run();
        });

        btnCancel.setOnClickListener(v -> dialog.dismiss());

        // Comprehensive validation loop resolving all loopholes
        btnSave.setOnClickListener(v -> {
            saveCurrentCardInputs(container, devoteeList);

            // 1. Validate Devotees
            int activeCount = 0;
            for (int i = 0; i < devoteeList.size(); i++) {
                Devotee d = devoteeList.get(i);
                int devNum = i + 1;

                if (d.active) activeCount++;

                // Validate Name
                if (d.name.trim().isEmpty()) {
                    Toast.makeText(MainActivity.this, "⚠️ Devotee #" + devNum + ": Name cannot be blank.", Toast.LENGTH_LONG).show();
                    return;
                }

                // Validate Age
                if (d.age.trim().isEmpty()) {
                    Toast.makeText(MainActivity.this, "⚠️ Devotee #" + devNum + " (" + d.name + "): Age cannot be blank.", Toast.LENGTH_LONG).show();
                    return;
                }
                try {
                    int ageVal = Integer.parseInt(d.age.trim());
                    if (ageVal < 1 || ageVal > 120) {
                        Toast.makeText(MainActivity.this, "⚠️ Devotee #" + devNum + ": Please enter a realistic age (1 - 120).", Toast.LENGTH_LONG).show();
                        return;
                    }
                } catch (NumberFormatException e) {
                    Toast.makeText(MainActivity.this, "⚠️ Devotee #" + devNum + ": Age must be a number.", Toast.LENGTH_LONG).show();
                    return;
                }

                // Validate ID Number & Aadhaar 12-digit rule
                String idNum = d.idNumber.trim();
                if (idNum.isEmpty()) {
                    Toast.makeText(MainActivity.this, "⚠️ Devotee #" + devNum + " (" + d.name + "): ID Number cannot be blank.", Toast.LENGTH_LONG).show();
                    return;
                }

                if (d.idType.equalsIgnoreCase("Aadhaar Card")) {
                    String cleanDigits = idNum.replaceAll("\\s+", "");
                    if (cleanDigits.length() != 12 || !cleanDigits.matches("\\d{12}")) {
                        Toast.makeText(MainActivity.this, "⚠️ Devotee #" + devNum + " (" + d.name + "): Aadhaar number MUST be exactly 12 digits (currently " + cleanDigits.length() + " digits).", Toast.LENGTH_LONG).show();
                        return;
                    }
                }
            }

            // Check active travel count
            if (activeCount == 0) {
                Toast.makeText(MainActivity.this, "⚠️ Please toggle at least 1 devotee to 'Going' before saving.", Toast.LENGTH_LONG).show();
                return;
            }
            if (activeCount > MAX_ACTIVE_DEVOTEES) {
                Toast.makeText(MainActivity.this, "⚠️ Maximum " + MAX_ACTIVE_DEVOTEES + " devotees can travel at once.", Toast.LENGTH_LONG).show();
                return;
            }

            // 2. Validate Address
            String email = etEmail.getText().toString().trim();
            String city = etCity.getText().toString().trim();
            String state = etState.getText().toString().trim();
            String pincode = etPincode.getText().toString().trim();

            if (email.isEmpty() || !email.contains("@") || !email.contains(".")) {
                Toast.makeText(MainActivity.this, "⚠️ Please enter a valid Email Address.", Toast.LENGTH_LONG).show();
                return;
            }
            if (city.isEmpty()) {
                Toast.makeText(MainActivity.this, "⚠️ City cannot be blank.", Toast.LENGTH_LONG).show();
                return;
            }
            if (state.isEmpty()) {
                Toast.makeText(MainActivity.this, "⚠️ State cannot be blank.", Toast.LENGTH_LONG).show();
                return;
            }
            if (!pincode.matches("\\d{6}")) {
                Toast.makeText(MainActivity.this, "⚠️ Pincode must be exactly 6 digits.", Toast.LENGTH_LONG).show();
                return;
            }

            // All checks passed! Save to storage
            saveDevoteesToPrefs(devoteeList);

            SharedPreferences.Editor editor = prefs.edit();
            editor.putString("email", email);
            editor.putString("city", city);
            editor.putString("state", state);
            editor.putString("pincode", pincode);
            editor.apply();

            updateReadyStatus();
            dialog.dismiss();
            Toast.makeText(MainActivity.this, "✅ Devotees pool saved & verified! Ready for 1-Click FastFill.", Toast.LENGTH_SHORT).show();
        });

        dialog.show();
    }

    private void applyIdTypeRules(String idType, TextView tvLabel, EditText etInput, TextView tvHelper) {
        if (idType.equalsIgnoreCase("Aadhaar Card")) {
            tvLabel.setText("AADHAAR NUMBER (EXACTLY 12 DIGITS) *");
            etInput.setInputType(InputType.TYPE_CLASS_NUMBER);
            etInput.setFilters(new InputFilter[]{new InputFilter.LengthFilter(12)});
            etInput.setHint("12-digit Aadhaar Number (Numbers only)");
            tvHelper.setText("Restricted to exactly 12 digits (Numbers only)");
        } else {
            tvLabel.setText(idType.toUpperCase() + " NUMBER *");
            etInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS);
            etInput.setFilters(new InputFilter[]{new InputFilter.LengthFilter(20)});
            etInput.setHint("Enter " + idType + " Number");
            tvHelper.setText("Alphanumeric supported (Max 20 chars)");
        }
    }

    private void saveCurrentCardInputs(LinearLayout container, List<Devotee> list) {
        for (int i = 0; i < container.getChildCount() && i < list.size(); i++) {
            View card = container.getChildAt(i);
            EditText etName = card.findViewById(R.id.et_name);
            EditText etAge = card.findViewById(R.id.et_age);
            Spinner spGender = card.findViewById(R.id.sp_gender);
            Spinner spIdType = card.findViewById(R.id.sp_id_type);
            EditText etIdNumber = card.findViewById(R.id.et_id_number);
            SwitchCompat switchGoing = card.findViewById(R.id.switch_going);

            if (etName != null) list.get(i).name = etName.getText().toString().trim().toUpperCase();
            if (etAge != null) list.get(i).age = etAge.getText().toString().trim();
            if (spGender != null && spGender.getSelectedItem() != null) list.get(i).gender = spGender.getSelectedItem().toString();
            if (spIdType != null && spIdType.getSelectedItem() != null) list.get(i).idType = spIdType.getSelectedItem().toString();
            if (etIdNumber != null) list.get(i).idNumber = etIdNumber.getText().toString().trim();
            if (switchGoing != null) list.get(i).active = switchGoing.isChecked();
        }
    }

    private List<Devotee> loadDevoteesFromPrefs() {
        List<Devotee> list = new ArrayList<>();
        String json = prefs.getString(KEY_DEVOTEES_JSON, null);
        if (json != null && !json.isEmpty()) {
            try {
                JSONArray arr = new JSONArray(json);
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject obj = arr.getJSONObject(i);
                    String idNum = obj.optString("idNumber", "");
                    String idType = obj.optString("idType", "Aadhaar Card");
                    // Clean Aadhaar if stored with excess digits
                    if (idType.equalsIgnoreCase("Aadhaar Card") && idNum.length() > 12) {
                        idNum = idNum.substring(0, 12);
                    }
                    list.add(new Devotee(
                            obj.optString("name", ""),
                            obj.optString("age", ""),
                            obj.optString("gender", "Male"),
                            idType,
                            idNum,
                            obj.optBoolean("active", true)
                    ));
                }
            } catch (Exception ignored) {}
        }

        if (list.isEmpty()) {
            list.add(new Devotee("VENKATESHWARLU K", "35", "Male", "Aadhaar Card", "123456789012", true));
            list.add(new Devotee("LAKSHMI DEVI K", "32", "Female", "Aadhaar Card", "987654321098", true));
        }

        return list;
    }

    private void saveDevoteesToPrefs(List<Devotee> list) {
        try {
            JSONArray arr = new JSONArray();
            for (Devotee d : list) {
                JSONObject obj = new JSONObject();
                obj.put("name", d.name);
                obj.put("age", d.age);
                obj.put("gender", d.gender);
                obj.put("idType", d.idType);
                String idNum = d.idNumber;
                if (d.idType.equalsIgnoreCase("Aadhaar Card") && idNum.length() > 12) {
                    idNum = idNum.substring(0, 12);
                }
                obj.put("idNumber", idNum);
                obj.put("active", d.active);
                arr.put(obj);
            }
            prefs.edit().putString(KEY_DEVOTEES_JSON, arr.toString()).apply();
        } catch (Exception ignored) {}
    }

    private void initDefaultPrefsIfNeeded() {
        if (!prefs.contains(KEY_DEVOTEES_JSON)) {
            List<Devotee> initial = new ArrayList<>();
            initial.add(new Devotee("VENKATESHWARLU K", "35", "Male", "Aadhaar Card", "123456789012", true));
            initial.add(new Devotee("LAKSHMI DEVI K", "32", "Female", "Aadhaar Card", "987654321098", true));
            saveDevoteesToPrefs(initial);

            SharedPreferences.Editor editor = prefs.edit();
            editor.putString("email", "devotee@gmail.com");
            editor.putString("city", "Bengaluru");
            editor.putString("state", "Karnataka");
            editor.putString("pincode", "560001");
            editor.apply();
        }
    }

    private String extractHost(String url) {
        try {
            java.net.URI uri = new java.net.URI(url);
            String host = uri.getHost();
            return host != null ? host : url;
        } catch (Exception e) {
            return "TTD Portal";
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    public class WebAppInterface {
        Context mContext;

        WebAppInterface(Context c) {
            mContext = c;
        }

        @JavascriptInterface
        public void onFillResult(boolean success, String message, int filledCount, long durationMs) {
            new Handler(Looper.getMainLooper()).post(() -> {
                btnFastFill.setEnabled(true);
                if (success) {
                    tvStatus.setText("✅ Filled " + filledCount + " Devotees in " + durationMs + "ms!");
                    Toast.makeText(mContext, "⚡ FastFill Completed (" + filledCount + " Devotees in " + durationMs + "ms)", Toast.LENGTH_LONG).show();
                } else {
                    tvStatus.setText("⚠️ " + message);
                    Toast.makeText(mContext, "FastFill Notice: " + message, Toast.LENGTH_LONG).show();
                }
            });
        }
    }
}
