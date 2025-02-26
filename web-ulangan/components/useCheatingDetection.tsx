/* eslint-disable @typescript-eslint/no-unused-vars */
import { handleSignOut } from "@/lib/signOutAction";
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";

interface CheatingDetectionResult {
  isTabHidden: boolean;
  isBlurred: boolean;
  isSplitScreen: boolean;
  isFloatingWindow: boolean;
  allClear: boolean;
}

const useCheatingDetection = (): CheatingDetectionResult => {
  const [isTabHidden, setIsTabHidden] = useState<boolean>(false);
  const [isBlurred, setIsBlurred] = useState<boolean>(false);
  const [isSplitScreen, setIsSplitScreen] = useState<boolean>(false);
  const [isFloatingWindow, setIsFloatingWindow] = useState<boolean>(false);

  const lastScreenSize = useRef<{ width: number; height: number }>({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const fullScreenSize = useRef<{ width: number; height: number }>({
    width: window.screen.width,
    height: window.screen.height,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const firstSplitWarningTimeRef = useRef<number | null>(null);

  // Untuk mencegah alert ganda
  const lastAlertTimeRef = useRef<{ [key: string]: number }>({
    tabHidden: 0,
    blurred: 0,
    splitScreen: 0,
    floatingWindow: 0,
    logoutWarning: 0,
  });

  // Fungsi anti-bounce untuk alert
  const showAlert = (message: string, type: string): void => {
    const now = Date.now();
    // Hanya tampilkan alert jika sudah lebih dari 2 detik sejak alert terakhir dengan tipe yang sama
    if (now - (lastAlertTimeRef.current[type] || 0) > 2000) {
      Swal.fire({
        icon: "warning",
        text: message,
        title: "Peringatan!",
      });
      lastAlertTimeRef.current[type] = now;
    }
  };

  // Fungsi untuk logout otomatis
  const autoLogout = async (): Promise<void> => {
    showAlert(
      "Anda telah keluar secara otomatis karena terdeteksi melakukan kecurangan!",
      "logout"
    );
    // Implementasi logout - misalnya redirect ke halaman login
    await handleSignOut();
  };

  // Deteksi apakah perangkat adalah mobile
  const isMobileDevice = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  const checkSplitScreen = (): void => {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;

    const widthRatio = currentWidth / screenWidth;
    const heightRatio = currentHeight / screenHeight;

    // Kurangi threshold untuk perangkat mobile
    const threshold = isMobileDevice() ? 0.7 : 0.8;
    const isSplit = widthRatio < threshold || heightRatio < threshold;

    if (isSplit) {
      // Set state jika belum di-set
      if (!isSplitScreen) {
        setIsSplitScreen(true);
        showAlert(
          "Peringatan! Anda terdeteksi menggunakan split screen!",
          "splitScreen"
        );
        firstSplitWarningTimeRef.current = Date.now();
      }

      // Jika masih split screen setelah 6 detik dari peringatan pertama
      if (firstSplitWarningTimeRef.current !== null) {
        const timeSinceFirstWarning =
          Date.now() - firstSplitWarningTimeRef.current;

        // Hanya buat timer countdown 10 detik jika belum ada timer yang aktif
        if (timeSinceFirstWarning >= 6000 && !logoutTimerRef.current) {
          showAlert(
            "Peringatan! Anda masih terdeteksi melakukan split screen, jika Anda tidak kembali dalam 10 detik maka akan otomatis logout",
            "logoutWarning"
          );

          // Set timer untuk logout otomatis setelah 10 detik
          logoutTimerRef.current = setTimeout(() => {
            if (isSplitScreen) {
              autoLogout();
            }
          }, 10000);
        }
      }
    } else {
      // Jika sudah tidak split screen lagi
      if (isSplitScreen) {
        setIsSplitScreen(false);
        firstSplitWarningTimeRef.current = null;

        // Clear logout timer jika ada
        if (logoutTimerRef.current) {
          clearTimeout(logoutTimerRef.current);
          logoutTimerRef.current = null;
        }
      }
    }
  };

  // Fungsi untuk memeriksa floating window
  const checkFloatingWindow = (): void => {
    // Untuk perangkat mobile, gunakan pendekatan khusus
    if (isMobileDevice()) {
      checkMobileFloatingApp();
      return;
    }

    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;

    // Deteksi floating window - ukuran browser kecil dan posisi tidak di pojok kiri atas
    const isSmallWindow =
      currentWidth < screenWidth * 0.9 && currentHeight < screenHeight * 0.9;
    const isNotFullyMaximized = window.screenX > 10 || window.screenY > 10;

    const isFloating = isSmallWindow && isNotFullyMaximized;

    if (isFloating !== isFloatingWindow) {
      setIsFloatingWindow(isFloating);

      if (isFloating) {
        showAlert(
          "Peringatan! Anda terdeteksi menggunakan floating window!",
          "floatingWindow"
        );
      }
    }
  };

  // Metode khusus untuk mendeteksi floating app di perangkat mobile
  const checkMobileFloatingApp = (): void => {
    // Deteksi perubahan fokus untuk aplikasi mobile
    const isFocused = document.hasFocus();
    const isVisible = !document.hidden;

    // Deteksi performance metrics - floating app biasanya menyebabkan penurunan performa
    const now = performance.now();
    const isSlowPerformance = false; // Implementasi lebih lanjut di bawah

    // Deteksi ukuran layar yang tidak konsisten
    const windowHeight = window.innerHeight;
    const docHeight = document.documentElement.clientHeight;
    const heightDifference = Math.abs(windowHeight - docHeight);

    // Deteksi keyboard yang tampil vs floating app
    const isHeightReductionFromFloatingApp =
      heightDifference > 100 &&
      !document.activeElement?.tagName?.match(/input|textarea|select/i);

    // Deteksi gesture/sentuhan yang tidak terduga
    // Misalnya: mendeteksi saat pengguna menyentuh di luar area aplikasi

    // Combined detection
    const possibleFloatingApp =
      isHeightReductionFromFloatingApp ||
      (isFocused && !isVisible) ||
      document.pictureInPictureElement !== null;

    if (possibleFloatingApp !== isFloatingWindow) {
      setIsFloatingWindow(possibleFloatingApp);

      if (possibleFloatingApp) {
        showAlert(
          "Peringatan! Anda terdeteksi menggunakan aplikasi floating/jendela kecil!",
          "floatingWindow"
        );
      }
    }
  };

  // Deteksi Picture-in-Picture yang digunakan untuk floating video
  useEffect(() => {
    const handlePictureInPicture = () => {
      if (document.pictureInPictureElement) {
        setIsFloatingWindow(true);
        showAlert(
          "Peringatan! Anda terdeteksi menggunakan Picture-in-Picture!",
          "floatingWindow"
        );
      } else {
        setIsFloatingWindow(false);
      }
    };

    // Untuk browser yang mendukung
    if ("pictureInPictureEnabled" in document) {
      document.addEventListener(
        "enterpictureinpicture",
        handlePictureInPicture
      );
      document.addEventListener(
        "leavepictureinpicture",
        handlePictureInPicture
      );
    }

    return () => {
      if ("pictureInPictureEnabled" in document) {
        document.removeEventListener(
          "enterpictureinpicture",
          handlePictureInPicture
        );
        document.removeEventListener(
          "leavepictureinpicture",
          handlePictureInPicture
        );
      }
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.hidden) {
        setIsTabHidden(true);
        showAlert(
          "Peringatan! Anda terdeteksi keluar dari halaman ujian.",
          "tabHidden"
        );
      } else {
        setIsTabHidden(false);
      }
    };

    const handleBlur = (): void => {
      setTimeout(() => {
        if (!document.hasFocus() && !isBlurred) {
          setIsBlurred(true);
          showAlert(
            "Peringatan! Anda terdeteksi membuka aplikasi lain.",
            "blurred"
          );
        }
      }, 1000); // Delay agar lebih akurat
    };

    const handleFocus = (): void => {
      setIsBlurred(false);
    };

    const handlePageHide = (): void => {
      showAlert("Peringatan! Anda meninggalkan halaman ujian.", "tabHidden");
    };

    const handleResize = (): void => {
      // Simpan ukuran layar untuk perbandingan
      lastScreenSize.current = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      // Periksa split screen saat resize
      checkSplitScreen();
    };

    // Periksa perubahan orientasi pada perangkat mobile
    const handleOrientationChange = (): void => {
      setTimeout(() => {
        checkSplitScreen();
        checkFloatingWindow();
      }, 500);
    };

    // Event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("resize", handleResize);

    // Khusus untuk mobile
    if (isMobileDevice()) {
      window.addEventListener("orientationchange", handleOrientationChange);
    }

    // Periksa split screen saat komponen mount
    checkSplitScreen();
    checkFloatingWindow();

    // Set interval untuk memeriksa split screen dan floating window setiap 3 detik
    intervalRef.current = setInterval(() => {
      checkSplitScreen();
      checkFloatingWindow();
    }, 3000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("resize", handleResize);

      if (isMobileDevice()) {
        window.removeEventListener(
          "orientationchange",
          handleOrientationChange
        );
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
    };
  }, [isBlurred, isSplitScreen, isFloatingWindow]);

  return {
    isTabHidden,
    isBlurred,
    isSplitScreen,
    isFloatingWindow,
    allClear: !isTabHidden && !isBlurred && !isSplitScreen && !isFloatingWindow,
  };
};

export default useCheatingDetection;
