"use client";
import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";

// Components
import Step1Form from "@/components/plant-operator/plant-registration/Step1Form";
import Step2Upload from "@/components/plant-operator/plant-registration/Step2Upload";
import Step3Confirmation from "@/components/plant-operator/plant-registration/Step3Confirmation";
import Step4Success from "@/components/plant-operator/plant-registration/Step4Success";
import Step5Success from "@/components/plant-operator/plant-registration/Step5Success";

// Hooks
import usePlantRegistration from "@/hooks/usePlantRegistration";

const PlantRegistrationForm = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const stepParam = searchParams.get("step");

  const {
    formData,
    plantStages,
    fuelTypes,
    currentStep,
    isLoading,
    uploadedData,
    handleChange,
    handleCertificationChange,
    handleSubmit,
    handleNext,
    handleFileUpload,
    handleBack,
    setCurrentStep,
    setUploadedData,
  } = usePlantRegistration(stepParam as string, router);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <div className="flex justify-center mb-6">
        <Image src="/logoGEX.png" alt="Logo" width={64} height={64} className="h-16" />
      </div>

      <div className="step-container">
        {currentStep === 1 && (
          <Step1Form
            formData={formData}
            plantStages={plantStages}
            fuelTypes={fuelTypes}
            handleChange={handleChange}
            handleCertificationChange={handleCertificationChange}
            handleSubmit={handleSubmit}
            setCurrentStep={setCurrentStep}
            handleNext={handleNext}
          />
        )}

        {currentStep === 2 && (
          <Step2Upload
            handleFileUpload={handleFileUpload}
            isLoading={isLoading}
            handleBack={handleBack}
          />
        )}

        {currentStep === 3 && uploadedData && (
          <Step3Confirmation
            uploadedData={uploadedData}
            setUploadedData={setUploadedData as React.Dispatch<React.SetStateAction<any>>}
            setCurrentStep={setCurrentStep}
          />
        )}

        {currentStep === 4 && uploadedData && (
          <Step4Success
            uploadedData={uploadedData}
            onGoToDashboard={() => router.push("/plant-operator/dashboard")}
          />
        )}

        {currentStep === 5 && uploadedData && (
          <Step5Success
            uploadedData={uploadedData}
            onGoToDashboard={() => router.push("/plant-operator/dashboard")}
          />
        )}
      </div>
    </div>
  );
};

export default PlantRegistrationForm;
