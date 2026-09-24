# ProGuard rules for TTD FastFill
-keepattributes *Annotation*
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class org.ttd.fastfill.MainActivity$WebAppInterface {
    public *;
}
