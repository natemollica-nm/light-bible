import React from "react";
import ContentContainer from "@/components/ContentContainer";
import { StyledText } from "@/components/StyledText";
import { n } from "@/utils/scaling";

export default function SettingsScreen() {
	return (
		<ContentContainer headerTitle="Settings" hideBackButton>
			<StyledText style={{ fontSize: n(18) }}>
				Settings coming soon.
			</StyledText>
		</ContentContainer>
	);
}
