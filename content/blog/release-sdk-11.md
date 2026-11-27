---
title: 'Titanium SDK 11.0.0.RC released'
description: 'We are proud to announce, that we have just release our newest RC version of Titanium SDK 11.0.0'
date: '2022-05-23'
author: 'Sebastian Klaus'
category: 'Releases'
social: |-
  Titanium SDK 11.0.0.RC is out!

  After months of work, the 11.0.0 release candidate arrives with a large batch of features and bug fixes.

  Blog: https://titaniumsdk.com/blog/release-sdk-11
  Install: ti sdk i 11.0.0.RC

  #titaniumsdk #mobiledev #javascript
---

After months of hard work, we are proud to announce that today we can introduce Titanium SDK 11.0.0.RC. A Release Candidate (RC for short) is a software build that is as good as complete.

The new RC version includes a massive amount of features and bug fixes.

For a more detailed overview, known issues and closed tickets, see the [release notes](/docs/sdk/11.0.0/release-notes).

There is also a new version of the [Titanium CLI](https://github.com/tidev/titanium) (6.0.2) and [Alloy](https://github.com/tidev/alloy) (2.0.1).

## Install

**Follow these steps to get SDK 11.0.0.RC:**

1. Install the CLI with `[sudo] npm i -g titanium alloy`
2. `titanium sdk install 11.0.0.RC`

You can also execute `titanium sdk install latest` to get the latest **GA** of the Titanium SDK

## Rollback

Execute `titanium sdk select 10.1.1.GA` to rollback

## New integration

We're also proud to announce the Alloy integration of [PurgeTSS](/docs/alloy/styles#purgetss), created by [macCesar](https://github.com/macCesar). [PurgeTSS](/docs/alloy/styles#purgetss) is an Alloy addon with predefined classes to use in the XML views. It can be used by all Titanium developers, who want to create beautiful designed mobile apps easily.

## Report Bugs

As this is a Release Candidate Version, it's not meant to be used for production. So please test it on your apps and give feedback so we will have a **bug-free/working GA** at the end. If you run into any issues that seem related to the updates, please report them on [GitHub](https://github.com/tidev/titanium-sdk/issues).

## How can I support?

If you like our work and want to support, think about a [donation](/contribute#donate) or to [contribute](/contribute) with your time and code.
