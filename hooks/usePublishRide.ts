import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CustomAlert } from '../utils/alert';

export interface PublishRidePayload {
  departure: string;
  arrival: string;
  price: string;
  seats: number;
  dateFormatted: string;
  routeDistance: string | null;
  routeDuration: string | null;
  routeDurationMin: number | null;
  arrivalTimeInput: string;
  trafficAlert: any;
  stopovers: { city: string; price: string }[];
  brand: string;
  licensePlate: string;
  currentCategory: string;
  isMoto: boolean;
  rideImage: string | null;
  max2Back: boolean;
  instantBooking: boolean;
  airConditioning: boolean;
  powerOutlets: boolean;
  recliningSeats: boolean;
  toilet: boolean;
  eTicket: boolean;
  allowsSmoking: boolean;
  allowsPets: boolean;
  baggageSize: string;
  hasRoofRack: boolean;
  onSuccess: () => void;
}

export function usePublishRide() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadRideImage = async (uri: string, userId: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'png';
    const filePath = `ride_${userId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const publishRide = async (payload: PublishRidePayload) => {
    const {
      departure, arrival, price, seats, dateFormatted, routeDistance, routeDuration,
      routeDurationMin, arrivalTimeInput, trafficAlert, stopovers, brand, licensePlate,
      currentCategory, isMoto, rideImage, max2Back, instantBooking, airConditioning,
      powerOutlets, recliningSeats, toilet, eTicket, allowsSmoking, allowsPets,
      baggageSize, hasRoofRack, onSuccess
    } = payload;

    if (!departure || !arrival || !price || !dateFormatted || (!isMoto && !brand) || !licensePlate) {
      CustomAlert.alert("Erreur", "Veuillez remplir tous les champs (y compris la plaque d'immatriculation).");
      return;
    }

    for (let stop of stopovers) {
      if (!stop.city) {
        CustomAlert.alert("Erreur", "Veuillez remplir le nom pour toutes les villes de passage.");
        return;
      }
    }

    try {
      setIsUploading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Vous devez être connecté pour publier un trajet.");

      let uploadedImageUrl = null;
      if (rideImage) {
        uploadedImageUrl = await uploadRideImage(rideImage, user.id);
      }

      let computedArrivalTime = null;
      if (dateFormatted && routeDurationMin) {
        const timePart = dateFormatted.split(' à ')[1];
        if (timePart) {
          const parts = timePart.split(':');
          if (parts.length >= 2) {
            const trafficMinutes = trafficAlert ? trafficAlert.additionalMinutes : 0;
            const totalMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + routeDurationMin + trafficMinutes;
            const arrHours = Math.floor(totalMinutes / 60) % 24;
            const arrMins = totalMinutes % 60;
            computedArrivalTime = `${String(arrHours).padStart(2, '0')}:${String(arrMins).padStart(2, '0')}`;
          }
        }
      }
      
      const finalArrivalTime = arrivalTimeInput.trim() || computedArrivalTime;

      const { error } = await supabase.from('rides').insert([
        {
          departure,
          arrival,
          price: price.replace(/\s/g, ''),
          seats,
          date: dateFormatted,
          distance: routeDistance || null,
          duration: routeDuration || null,
          duration_min: routeDurationMin || null,
          arrival_time: finalArrivalTime,
          driver_id: user.id,
          stopovers: stopovers,
          vehicle_brand: brand,
          license_plate: licensePlate.toUpperCase().trim(),
          vehicle_type: currentCategory,
          is_moto: isMoto,
          driver_name: user.user_metadata?.first_name || 'Anonyme',
          driver_avatar: user.user_metadata?.avatar_url || null,
          vehicle_photo: uploadedImageUrl,
          max_2_back: max2Back,
          instant_booking: instantBooking,
          air_conditioning: airConditioning,
          power_outlets: powerOutlets,
          reclining_seats: recliningSeats,
          toilet: toilet,
          e_ticket: eTicket,
          allows_smoking: allowsSmoking,
          allows_pets: allowsPets,
          baggage_size: baggageSize,
          has_roof_rack: hasRoofRack
        }
      ]);

      if (error) throw error;

      CustomAlert.alert(
        "Succès", 
        `Votre trajet en ${currentCategory} a été publié avec succès !`,
        [{ text: "OK", onPress: onSuccess }]
      );
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : "Impossible de publier le trajet.";
      CustomAlert.alert("Erreur", errMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return { isUploading, publishRide };
}
