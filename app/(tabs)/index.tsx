import React from "react";
import ContentContainer from "@/components/ContentContainer";
import { StyledText } from "@/components/StyledText";
import { n } from "@/utils/scaling";

export default function ReadScreen() {
	return (
		<ContentContainer headerTitle="Bible" hideBackButton>
			<StyledText style={{ fontSize: n(18) }}>
				Select a translation to begin reading.
			</StyledText>
		</ContentContainer>
	);
}
