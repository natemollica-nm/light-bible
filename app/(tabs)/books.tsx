import React from "react";
import ContentContainer from "@/components/ContentContainer";
import { StyledText } from "@/components/StyledText";
import { n } from "@/utils/scaling";

export default function BooksScreen() {
	return (
		<ContentContainer headerTitle="Books" hideBackButton>
			<StyledText style={{ fontSize: n(18) }}>
				Book picker coming soon.
			</StyledText>
		</ContentContainer>
	);
}
