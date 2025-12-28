import { BackButton } from "@/components/ui/BackButton";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function Join() {
  return (
    <View style={styles.root}>
      <BackButton to="/home" label="Home" />
      <Text style={styles.text}>Join Scene (stub)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "black", alignItems: "center", justifyContent: "center" },
  text: { color: "white", opacity: 0.8 },
});