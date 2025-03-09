/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { handleSignOut } from "@/lib/signOutAction";
import { usePathname } from "next/navigation";
import { useEffect, ReactNode, useState, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import { getDistance } from "geolib";

const SCHOOL_LOCATION = {
  latitude: -2.91886,
  longitude: 104.813269,
};

const RADIUS = 100;

const formatDistance = (distance: number): string => {
  return distance >= 1000
    ? `${(distance / 1000).toFixed(1)} km`
    : `${distance} m`;
};

export default function UjianPage({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [locationVerified, setLocationVerified] = useState(false);
  const [motionVerified, setMotionVerified] = useState(false);

  const [previousPositions, setPreviousPositions] = useState<
    { latitude: number; longitude: number; timestamp: number }[]
  >([]);
  const maxPreviousPositions = 3;

  const locationCheckInProgress = useRef(false);
  const locationCheckComplete = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = useCallback((message: string) => {
    Swal.fire({
      title: "Logout",
      text: message,
      icon: "error",
      confirmButtonText: "OK",
    });

    // Langsung logout tanpa menunggu tombol "OK"
    // handleSignOut();
  }, []);

  const verifyMotionSecondChance = useCallback(() => {
    let motionDetected = false;

    const motionHandler = (event: DeviceMotionEvent) => {
      const acceleration = event.acceleration;

      if (
        acceleration &&
        ((acceleration.x !== null && Math.abs(acceleration.x) > 0.01) ||
          (acceleration.y !== null && Math.abs(acceleration.y) > 0.01) ||
          (acceleration.z !== null && Math.abs(acceleration.z) > 0.01))
      ) {
        motionDetected = true;
      }
    };

    window.addEventListener("devicemotion", motionHandler);

    Swal.fire({
      title: "Gerakan Perangkat Anda",
      text: "Silakan gerakan perangkat Anda sedikit untuk verifikasi...",
      icon: "info",
      showConfirmButton: false,
      timer: 8000,
      timerProgressBar: true,
    });

    setTimeout(() => {
      window.removeEventListener("devicemotion", motionHandler);

      if (!motionDetected) {
        Swal.fire({
          title: "Peringatan",
          text: "Sensor tidak terdeteksi optimal. Pastikan perangkat tidak dalam mode hemat daya.",
          icon: "warning",
          confirmButtonText: "Lanjutkan",
        });
        setMotionVerified(true);
      } else {
        Swal.fire({
          title: "Verifikasi Berhasil",
          text: "Sensor gerak terdeteksi normal",
          icon: "success",
          timer: 1500,
        });
        setMotionVerified(true);
      }
    }, 8000);
  }, []);

  const checkMotionSensors = useCallback(() => {
    if (!window.DeviceMotionEvent) {
      console.warn("Perangkat tidak mendukung sensor gerak.");
      setMotionVerified(true);
      return;
    }

    let motionDetected = false;
    let orientationDetected = false;
    let hasCheckedMotion = false;
    let hasCheckedOrientation = false;

    const motionThreshold = 0.01;

    const motionHandler = (event: DeviceMotionEvent) => {
      const acceleration = event.acceleration;

      if (acceleration) {
        hasCheckedMotion = true;
        if (
          (acceleration.x !== null &&
            Math.abs(acceleration.x) > motionThreshold) ||
          (acceleration.y !== null &&
            Math.abs(acceleration.y) > motionThreshold) ||
          (acceleration.z !== null &&
            Math.abs(acceleration.z) > motionThreshold)
        ) {
          motionDetected = true;
        }
      }
    };

    const orientationHandler = (event: DeviceOrientationEvent) => {
      hasCheckedOrientation = true;
      if (event.alpha !== null || event.beta !== null || event.gamma !== null) {
        orientationDetected = true;
      }
    };

    window.addEventListener("devicemotion", motionHandler);
    window.addEventListener("deviceorientation", orientationHandler);

    setTimeout(() => {
      window.removeEventListener("devicemotion", motionHandler);
      window.removeEventListener("deviceorientation", orientationHandler);

      if (!hasCheckedMotion && !hasCheckedOrientation) {
        console.log(
          "Sensor tidak mengirim data - kemungkinan tidak didukung perangkat"
        );
        setMotionVerified(true);
        return;
      }

      if (!motionDetected && !orientationDetected) {
        Swal.fire({
          title: "Verifikasi Sensor",
          text: "Silakan gerakan perangkat Anda sedikit untuk verifikasi sensor.",
          icon: "info",
          showCancelButton: false,
          confirmButtonText: "Verifikasi Ulang",
        }).then(() => {
          verifyMotionSecondChance();
        });
      } else {
        console.log("Sensor gerak terdeteksi normal");
        setMotionVerified(true);
      }
    }, 10000);
  }, [verifyMotionSecondChance]);

  const getUserLocation = useCallback(() => {
    if (locationCheckInProgress.current || locationCheckComplete.current) {
      return;
    }

    locationCheckInProgress.current = true;

    if (!navigator.geolocation) {
      locationCheckInProgress.current = false;
      handleLogout("Perangkat kamu tidak mendukung GPS.");
      return;
    }

    if (window.isSecureContext === false) {
      locationCheckInProgress.current = false;
      handleLogout("Geolocation hanya berfungsi di HTTPS atau localhost.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationCheckInProgress.current = false;
        locationCheckComplete.current = true;

        const { latitude, longitude, accuracy } = position.coords;
        const distance = getDistance({ latitude, longitude }, SCHOOL_LOCATION);

        if (accuracy < 0.5) {
          handleLogout(
            "Deteksi GPS tidak wajar. Kemungkinan menggunakan Fake GPS."
          );
          return;
        }

        if (distance > RADIUS) {
          handleLogout(
            `Kamu terdeteksi berada di (${formatDistance(
              distance
            )}  di luar area sekolah! )`
          );
        } else {
          // Add position to history
          setPreviousPositions((prev) => {
            const updated = [
              ...prev,
              { latitude, longitude, timestamp: Date.now() },
            ];
            if (updated.length > maxPreviousPositions) {
              return updated.slice(1); // Remove oldest
            }
            return updated;
          });

          Swal.fire({
            title: "Lokasi terdeteksi!",
            text: `Kamu berada dalam radius sekolah (${distance} meter).`,
            icon: "success",
          }).then(() => {
            setLocationVerified(true);

            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS) {
              console.log(
                "Mendeteksi perangkat iOS, melewati pemeriksaan sensor"
              );
              setMotionVerified(true);
            } else {
              checkMotionSensors();
            }

            if (intervalRef.current === null) {
              intervalRef.current = setInterval(() => {
                checkLocationConsistency();
              }, 30000);
            }
          });
        }
      },
      (error) => {
        locationCheckInProgress.current = false;
        console.error("Location error:", error);
        handleLogout(
          "Gagal mendapatkan lokasi. Harap izinkan akses GPS di pengaturan browser."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [handleLogout, checkMotionSensors]);

  const checkLocationConsistency = useCallback(() => {
    if (previousPositions.length < 2) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const currentPosition = { latitude, longitude };

        setPreviousPositions((prev) => {
          const updated = [
            ...prev,
            { latitude, longitude, timestamp: Date.now() },
          ];
          if (updated.length > maxPreviousPositions) {
            return updated.slice(1);
          }
          return updated;
        });

        const lastPosition = previousPositions[previousPositions.length - 1];
        const timeDiff = (Date.now() - lastPosition.timestamp) / 1000;

        const distance = getDistance(
          {
            latitude: lastPosition.latitude,
            longitude: lastPosition.longitude,
          },
          currentPosition
        );

        const speed = distance / timeDiff;

        const distanceToSchool = getDistance(currentPosition, SCHOOL_LOCATION);

        if (distanceToSchool > RADIUS) {
          handleLogout(
            `Kamu di luar area sekolah! (${distanceToSchool}m dari sekolah)`
          );
        }

        if (distance > 10 && speed > 15) {
          handleLogout(
            `Deteksi pergerakan tidak wajar. Kemungkinan menggunakan Fake GPS.`
          );
        }
      },
      (error) => {
        console.error("Location consistency check error:", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [previousPositions, handleLogout]);

  const requestLocationPermission = useCallback(async () => {
    if (locationCheckInProgress.current || locationCheckComplete.current) {
      return;
    }

    if (!navigator.permissions) {
      console.warn("Permission API tidak didukung.");
      getUserLocation();
      return;
    }

    try {
      const permission = await navigator.permissions.query({
        name: "geolocation",
      });

      if (permission.state === "granted") {
        getUserLocation();
      } else if (permission.state === "prompt") {
        Swal.fire({
          title: "Izinkan akses lokasi?",
          text: "Kami perlu memeriksa apakah kamu berada di dalam sekolah.",
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Izinkan",
          cancelButtonText: "Tolak",
        }).then((result) => {
          if (result.isConfirmed) {
            getUserLocation();
          } else {
            handleLogout("Kamu menolak akses lokasi!");
          }
        });
      } else {
        handleLogout(
          "Izin lokasi ditolak. Harap aktifkan di pengaturan browser."
        );
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
      getUserLocation();
    }
  }, [getUserLocation, handleLogout]);

  useEffect(() => {
    if (pathname !== "/ujian") {
      window.location.href = "/ujian";
    } else if (
      !locationCheckComplete.current &&
      !locationCheckInProgress.current
    ) {
      const timer = setTimeout(() => {
        requestLocationPermission();
      }, 1000);
      return () => clearTimeout(timer);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pathname, requestLocationPermission]);

  return <>{children}</>;
}
