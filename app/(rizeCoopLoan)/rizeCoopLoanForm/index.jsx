// RizeCoop removed for this build — original screen kept below, commented out.
// Stub default export so expo-router doesn't warn about a route with no component.
export default function RizeCoopRemoved() {
  return null;
}

// // screens/RizeCoopLoanForm.jsx
// import React, { useState } from 'react';
// import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
// import Header from 'components/header';
// import { navigateBack, navigateTo } from 'app/navigate';
// import Dropdown from 'components/dropDown';
// import TouchBtn from 'components/touchBtn';
// import WalletBalanceCard from 'components/walletCard';
// import { Colors } from 'config/theme';
//
// export default function RizeCoopLoanForm() {
//   const [loanAmount, setLoanAmount] = useState('');
//   const [repaymentDuration, setRepaymentDuration] = useState('');
//   const [termsAccepted, setTermsAccepted] = useState(false);
//
//   const [showDurationDropdown, setShowDurationDropdown] = useState(false);
//
//   const collateralAmount = '400,000';
//   const eligibleAmount = '400,000';
//   const interest = '2%';
//   const totalRepayable = '257,000';
//
//   const durationOptions = [
//     { label: '2 Month', value: '2' },
//     { label: '3 Month', value: '3' },
//     { label: '4 Month', value: '4' },
//   ];
//
//   const handleContinue = () => {
//     // if (!termsAccepted) {
//     //   alert('Please accept the terms & conditions');
//     //   return;
//     // }
//     // console.log('Loan form submitted:', {
//     //   loanAmount,
//     //   collateralAmount,
//     //   eligibleAmount,
//     //   repaymentDuration,
//     //   interest,
//     //   totalRepayable,
//     // });
//     navigateTo('rizeCoopLoans');
//   };
//
//   return (
//     <View className="flex-1 bg-white">
//       <ScrollView
//         className="flex-1"
//         contentContainerStyle={{ flexGrow: 1 }}
//         showsVerticalScrollIndicator={false}>
//         <Header
//           title="RizeCoop Loan"
//           onLeftPress={navigateBack}
//           showLeftIcon={true}
//           color="black"
//         />
//
//         {/* Wallet Card */}
//         <View>
//           <WalletBalanceCard
//             walletName="RizeCoop Loan"
//             description="Review your loan details below to get started."
//             color="#566D24"
//             showWalletName={true}
//             showBalance={false}
//             showBalanceToggle={false}
//             showDescription={true}
//             showDescriptionButton={false}
//             showPoints={false}
//             showWalletNumber={false}
//             showCopyWallet={false}
//             showTopRightButton={false}
//             containerClassName="mx-5 mb-8"
//           />
//         </View>
//
//         <View className="flex-1 px-5">
//           {/* Loan Amount */}
//           <View className="mb-4">
//             <Text className="mb-2 text-sm font-semibold text-gray-900">Loan Amount</Text>
//             <TextInput
//               className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900"
//               value={loanAmount}
//               onChangeText={setLoanAmount}
//               placeholder="₦200,000"
//               placeholderTextColor="#9CA3AF"
//               keyboardType="decimal-pad"
//             />
//           </View>
//
//           {/* Collateral Amount */}
//           <View className="mb-4">
//             <Text className="mb-2 text-sm font-semibold text-gray-900">Collateral Amount</Text>
//             <View className="rounded-lg bg-gray-100 px-4 py-3">
//               <Text className="text-base text-gray-700">₦{collateralAmount}</Text>
//             </View>
//           </View>
//
//           {/* Eligible Amount */}
//           <View className="mb-4">
//             <Text className="mb-2 text-sm font-semibold text-gray-900">Eligible Amount</Text>
//             <View className="rounded-lg bg-gray-100 px-4 py-3">
//               <Text className="text-base text-gray-700">₦{eligibleAmount}</Text>
//             </View>
//           </View>
//
//           {/* Repayment Duration Dropdown */}
//           <Dropdown
//             label="Repayment Duration"
//             placeholder="Select repayment duration"
//             value={repaymentDuration}
//             options={durationOptions}
//             onSelect={(value) => {
//               setRepaymentDuration(value);
//               setShowDurationDropdown(false);
//             }}
//             isOpen={showDurationDropdown}
//             onToggle={() => setShowDurationDropdown(!showDurationDropdown)}
//           />
//
//           {/* Interest */}
//           <View className="mb-4">
//             <Text className="mb-2 text-sm font-semibold text-gray-900">Interest</Text>
//             <View className="rounded-lg bg-gray-100 px-4 py-3">
//               <Text className="text-base text-gray-700">{interest}</Text>
//             </View>
//           </View>
//
//           {/* Info Box */}
//           <View className="mb-4 rounded-lg bg-blue-100 p-4">
//             <Text className="mb-2 font-semibold text-gray-900">Info:</Text>
//             <Text className="text-sm text-gray-700">
//               • Your ₦200,000 collateral will allow a loan up to ₦400,000 at lower interest rate.
//               Your collateral is locked until full repayment
//             </Text>
//           </View>
//
//           {/* Terms Checkbox */}
//           <TouchableOpacity
//             onPress={() => setTermsAccepted(!termsAccepted)}
//             className="mb-4 flex-row items-start">
//             <View
//               className="mr-3 h-5 w-5 items-center justify-center rounded border-2"
//               style={{
//                 borderColor: termsAccepted ? Colors?.primary : Colors?.secondary,
//                 backgroundColor: termsAccepted ? Colors?.primary : 'transparent',
//               }}>
//               {termsAccepted && <Text className="text-xs text-white">✓</Text>}
//             </View>
//
//             <Text className="flex-1 text-sm text-gray-700">
//               By ticking this box you accept the terms & conditions
//             </Text>
//           </TouchableOpacity>
//
//           {/* Total Repayable */}
//           <View className="mb-8">
//             <Text className="mb-2 text-sm font-semibold text-gray-900">Total Repayable</Text>
//             <View className="rounded-lg bg-gray-100 px-4 py-3">
//               <Text className="text-base font-semibold text-gray-900">₦{totalRepayable}</Text>
//             </View>
//           </View>
//         </View>
//
//         {/* Continue Button - Fixed at Bottom */}
//         <View className="px-5 pb-6">
//           <TouchBtn
//             onPress={handleContinue}
//             label="Continue"
//             textClassName="text-base font-semibold"
//             buttonClassName="items-center rounded-lg py-4"
//             activeOpacity={0.8}
//             containerClassName=""
//           />
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
